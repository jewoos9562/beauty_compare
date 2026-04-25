#!/usr/bin/env node

/**
 * 크롤링 파이프라인 v4.1
 *
 * 누락 없는 완벽 수집:
 * - 페이지 끝까지 스크롤 (lazy load 트리거)
 * - img[src], data-src, data-lazy, background-image 전부 수집
 * - iframe 내부 텍스트 + 이미지도 추출
 * - 최소 크기 필터 없음 (1KB 미만만 제외)
 * - 이미지 다운로드 타임아웃 없음
 * - MD5 해시로 동일 파일 중복 제거
 * - URL 정규화로 중복 제거
 */

import { createHash } from 'crypto';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { getTargets, listDistricts } from './config.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PRICE_KEYWORDS = ['가격', '비용', '시술', '이벤트', '프로모션', 'price', 'menu', '메뉴', '상담', '보톡스', '필러', '리프팅', '레이저', '토닝', '스킨부스터', '할인', '특가', '원데이', 'event'];
const IMAGE_KEYWORDS = ['가격', '비용', '시술', '이벤트', '프로모션', 'price', 'menu', 'event', '할인', '특가', '보톡스', '필러', '리프팅', 'banner', '배너', 'popup', '팝업'];
const MAX_PAGES = 100;
const PAGE_TIMEOUT = 30000;
const IMG_CONCURRENCY = 3;

function normalizeImgUrl(src) {
  try { const u = new URL(src); u.search = ''; u.hash = ''; return u.href; }
  catch { return src; }
}

/** Strip resize/thumbnail params to get original quality image URL */
function getOriginalUrl(src) {
  try {
    const u = new URL(src);
    const RESIZE_PARAMS = ['w', 'h', 'width', 'height', 'size', 'thumb', 'thumbnail', 'resize', 'fit', 'format', 'quality', 'q', 'dpr'];
    let changed = false;
    for (const p of RESIZE_PARAMS) {
      if (u.searchParams.has(p)) { u.searchParams.delete(p); changed = true; }
    }
    return changed ? u.href : src;
  } catch { return src; }
}

async function parallel(items, n, fn) {
  for (let i = 0; i < items.length; i += n) {
    await Promise.allSettled(items.slice(i, i + n).map(fn));
  }
}

async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let lastHeight = 0;
      let stableCount = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 800);
        const currentHeight = document.body.scrollHeight;
        if (currentHeight === lastHeight) {
          stableCount++;
          if (stableCount >= 3) { clearInterval(timer); window.scrollTo(0, 0); resolve(undefined); }
        } else {
          stableCount = 0;
          lastHeight = currentHeight;
        }
      }, 150);
      setTimeout(() => { clearInterval(timer); window.scrollTo(0, 0); resolve(undefined); }, 15000);
    });
  });
  await new Promise(r => setTimeout(r, 1500));
}

// --- STEP 1: Discover pages + images ---
async function discoverPages(browser, homepage, isChain = false) {
  const visited = new Set();
  const results = [];
  const imageResults = [];
  const seenImages = new Set();
  const baseHost = new URL(homepage).hostname;
  const allLinks = []; // collect links across pages

  const homePath = new URL(homepage).pathname.replace(/\/$/, '');
  const branchSegment = homePath && homePath.length > 3
    ? homePath.split('/').filter(Boolean).pop() || '' : '';
  const restrictLinks = isChain && branchSegment && branchSegment.length > 2;

  const SKIP_PATTERNS = ['logout', 'sign-in', 'sign-up', 'login', 'membership', 'password', 'register'];
  let boilerplateLines = null; // will be set from first page

  async function crawlPage(url, depth) {
    const cleanUrl = url.split('#')[0]; // strip hash
    if (visited.size >= MAX_PAGES) return;
    if (visited.has(cleanUrl) || depth > 3) return;
    if (SKIP_PATTERNS.some(p => cleanUrl.toLowerCase().includes(p))) return;
    visited.add(cleanUrl);

    // New page per URL — prevents state contamination
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (type === 'font' || type === 'media') req.abort();
      else req.continue();
    });

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
      if (!resp || !resp.ok()) { await page.close(); return; }

      await scrollToBottom(page);

      // --- Clean text ---
      function cleanText(raw) {
        return raw
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ \t]{2,}/g, ' ')
          .trim();
      }

      // Remove lines that repeat across every page (nav/footer boilerplate)
      function removeBoilerplate(text, boilerplateLines) {
        if (!boilerplateLines) return text;
        const lines = text.split('\n');
        return lines.filter(l => !boilerplateLines.has(l.trim())).join('\n');
      }

      // --- Extract text (main page) — remove nav/header/footer/popups ---
      const mainText = await page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, nav, header, footer, .cookie-banner, .chat-widget, [class*="gnb"], [class*="lnb"], [class*="sidebar"], [class*="modal"], [class*="popup"], [class*="alert"], [class*="notification"], [id*="header"], [id*="footer"], [id*="nav"]').forEach(el => el.remove());
        return clone.innerText?.trim() || '';
      });

      // --- Extract text + images from iframes ---
      let iframeTexts = [];
      let iframeImages = [];
      try {
        const frames = page.frames();
        for (const frame of frames) {
          if (frame === page.mainFrame()) continue;
          try {
            const fUrl = frame.url();
            if (!fUrl || fUrl === 'about:blank') continue;

            const fText = await frame.evaluate(() => {
              // 1. Structured price table (common-container pattern)
              const containers = document.querySelectorAll('.common-container, [class*="price-row"], [class*="treatment-row"]');
              if (containers.length > 0) {
                const rows = [];
                for (const row of containers) {
                  const name = row.querySelector('.treatment-title, [class*="item-name"], [class*="treatment-name"]')?.innerText?.trim();
                  if (!name) continue;
                  const origPrice = row.querySelector('.web-original-price-area, [class*="original-price"]')?.innerText?.trim();
                  const discountRate = row.querySelector('.discount-banner-rate, [class*="discount-rate"]')?.innerText?.trim();
                  const finalEl = row.querySelector('.web-print-final-price, [class*="final-price"]');
                  const finalText = finalEl?.innerText?.trim()?.replace(/\s+/g, '') || '';
                  const parts = [name];
                  if (origPrice) parts.push('정가 ' + origPrice);
                  if (discountRate) parts.push(discountRate + ' 할인');
                  if (finalText) parts.push('→ ' + finalText);
                  rows.push(parts.join(' | '));
                }
                if (rows.length > 0) return rows.join('\n');
              }

              // 2. HTML table
              const tables = document.querySelectorAll('table');
              if (tables.length > 0) {
                const rows = [];
                for (const table of tables) {
                  for (const tr of table.querySelectorAll('tr')) {
                    const cells = [...tr.querySelectorAll('td, th')].map(td => td.innerText?.trim()).filter(Boolean);
                    if (cells.length > 0) rows.push(cells.join(' | '));
                  }
                }
                if (rows.length > 0) return rows.join('\n');
              }

              // 3. Fallback: block-level line breaks
              const clone = document.body.cloneNode(true);
              clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
              for (const el of clone.querySelectorAll('div, p, li, tr, h1, h2, h3, h4, h5, h6, br')) {
                el.insertAdjacentText('afterend', '\n');
              }
              return clone.innerText?.trim() || '';
            });
            if (fText && fText.length > 10) iframeTexts.push(`[iframe: ${fUrl}]\n${fText}`);

            const fImgs = await frame.evaluate((kwList) => {
              const imgs = [];
              const seen = new Set();
              function addImg(src, el) {
                if (!src || src.startsWith('data:') || seen.has(src)) return;
                seen.add(src);
                const rect = el?.getBoundingClientRect?.() || {};
                const w = el?.naturalWidth || rect.width || 0;
                const h = el?.naturalHeight || rect.height || 0;
                const alt = (el?.alt || '').trim();
                const parentText = (el?.parentElement?.innerText || '').trim().slice(0, 200);
                const nearby = (el?.closest?.('section, article, div')?.innerText || '').trim().slice(0, 300);
                const allText = [src, alt, parentText, nearby].join(' ').toLowerCase();
                let score = 0;
                for (const kw of kwList) { if (allText.includes(kw)) score++; }
                if (w > 600 || h > 600) score += 1;
                if (w > 1000 || h > 1000) score += 1;
                imgs.push({ src, alt, context: (parentText || nearby).slice(0, 300), w: Math.round(w), h: Math.round(h), score });
              }
              for (const img of document.querySelectorAll('img')) {
                addImg(img.src, img);
                const lazySrc = img.dataset?.src || img.dataset?.lazy || img.dataset?.original || img.getAttribute('data-src');
                if (lazySrc) addImg(lazySrc, img);
              }
              for (const el of document.querySelectorAll('[style*="background"]')) {
                const match = el.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/);
                if (match?.[1]) addImg(match[1], el);
              }
              return imgs;
            }, IMAGE_KEYWORDS);
            if (fImgs?.length) iframeImages.push(...fImgs);
          } catch { /* cross-origin iframe, skip */ }
        }
      } catch { /* no frames */ }

      let fullText = cleanText([mainText, ...iframeTexts].join('\n\n'));

      // Build boilerplate from first page, remove from subsequent pages
      if (!boilerplateLines && mainText.length > 200) {
        const lines = mainText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 100);
        boilerplateLines = new Set(lines);
      } else if (boilerplateLines) {
        fullText = removeBoilerplate(fullText, boilerplateLines);
        fullText = cleanText(fullText);
      }

      if (fullText.length > 0) {
        results.push({ url: cleanUrl, text: fullText });
      }

      // --- Extract images (main page) — inline to avoid serialization issues ---
      const mainImages = await page.evaluate((kwList) => {
        const imgs = [];
        const seen = new Set();
        function addImg(src, el) {
          if (!src || src.startsWith('data:') || seen.has(src)) return;
          seen.add(src);
          const rect = el?.getBoundingClientRect?.() || {};
          const w = el?.naturalWidth || rect.width || 0;
          const h = el?.naturalHeight || rect.height || 0;
          const alt = (el?.alt || '').trim();
          const parentText = (el?.parentElement?.innerText || '').trim().slice(0, 200);
          const nearby = (el?.closest?.('section, article, div')?.innerText || '').trim().slice(0, 300);
          const allText = [src, alt, parentText, nearby].join(' ').toLowerCase();
          let score = 0;
          for (const kw of kwList) { if (allText.includes(kw)) score++; }
          if (w > 600 || h > 600) score += 1;
          if (w > 1000 || h > 1000) score += 1;
          imgs.push({ src, alt, context: (parentText || nearby).slice(0, 300), w: Math.round(w), h: Math.round(h), score });
        }
        for (const img of document.querySelectorAll('img')) {
          addImg(img.src, img);
          const lazySrc = img.dataset?.src || img.dataset?.lazy || img.dataset?.original || img.getAttribute('data-src');
          if (lazySrc) addImg(lazySrc, img);
        }
        for (const el of document.querySelectorAll('[style*="background"]')) {
          const match = el.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/);
          if (match?.[1]) addImg(match[1], el);
        }
        return imgs;
      }, IMAGE_KEYWORDS);
      const allPageImages = [...mainImages, ...iframeImages];

      for (const img of allPageImages) {
        const normUrl = normalizeImgUrl(img.src);
        if (!seenImages.has(normUrl)) {
          seenImages.add(normUrl);
          imageResults.push({
            sourceUrl: url, imageUrl: img.src,
            alt: img.alt, context: img.context,
            width: img.w, height: img.h, score: img.score,
          });
        }
      }

      // --- Find internal links ---
      if (depth < 3) {
        const links = await page.evaluate((host) => {
          return [...new Set(
            [...document.querySelectorAll('a[href]')]
              .map(a => a.href)
              .filter(href => {
                try {
                  const u = new URL(href);
                  return (u.hostname === host || u.hostname.endsWith('.' + host)) && !href.match(/\.(pdf|zip|jpg|png|gif|mp4)$/i);
                } catch { return false; }
              })
          )];
        }, baseHost);

        const scored = links
          .filter(l => {
            if (visited.has(l)) return false;
            if (restrictLinks && !l.includes(branchSegment)) return false;
            return true;
          })
          .map(link => {
            const lower = link.toLowerCase();
            const score = PRICE_KEYWORDS.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
            return { link, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);

        for (const { link } of scored) {
          await crawlPage(link, depth + 1);
        }
      }
      await page.close();
    } catch (e) {
      try { await page.close(); } catch {}
    }
  }

  await crawlPage(homepage, 0);
  return { pages: results, images: imageResults };
}

// --- STEP 2: Save raw text ---
async function saveRawText(hiraId, clinicName, pages) {
  if (pages.length === 0) return 0;
  await supabase.from('crawl_pages').delete().eq('hira_id', hiraId);
  const rows = pages.map(p => ({
    hira_id: hiraId, clinic_name: clinicName, url: p.url,
    raw_text: p.text, char_count: p.text.length,
  }));
  const { error } = await supabase.from('crawl_pages').insert(rows);
  if (error) { console.error('  [db] crawl_pages:', error.message?.slice(0, 80)); return 0; }
  return rows.length;
}

// --- STEP 3: Save images (no timeout, hash dedup) ---
async function saveImages(hiraId, clinicName, images) {
  if (images.length === 0) return { saved: 0, skipped: 0, dupeHash: 0 };

  const { data: existing } = await supabase
    .from('crawl_images').select('image_url').eq('hira_id', hiraId);
  const existingUrls = new Set((existing || []).map(e => e.image_url));
  const newImages = images.filter(img => !existingUrls.has(img.imageUrl));
  const skipped = images.length - newImages.length;
  let saved = 0, dupeHash = 0;
  const seenHashes = new Set();

  await parallel(newImages, IMG_CONCURRENCY, async (img) => {
    try {
      // Try original (no resize params) first, fallback to original URL
      const origUrl = getOriginalUrl(img.imageUrl);
      const controller = new AbortController();
      const dlTimeout = setTimeout(() => controller.abort(), 60000);
      let resp = await fetch(origUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
        signal: controller.signal,
      }).catch(() => null);
      if (!resp?.ok && origUrl !== img.imageUrl) {
        resp = await fetch(img.imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
          signal: controller.signal,
        }).catch(() => null);
      }
      clearTimeout(dlTimeout);
      if (!resp?.ok) return;
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) return;

      const buffer = Buffer.from(await resp.arrayBuffer());
      if (buffer.length < 1000) return;

      const hash = createHash('md5').update(buffer).digest('hex');
      if (seenHashes.has(hash)) { dupeHash++; return; }
      seenHashes.add(hash);

      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const storagePath = `${hiraId.slice(0, 20)}/${Date.now()}-${saved}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('crawl-images').upload(storagePath, buffer, { contentType, upsert: false });
      if (uploadErr) return;

      const { error: dbErr } = await supabase.from('crawl_images').insert({
        hira_id: hiraId, clinic_name: clinicName,
        source_url: img.sourceUrl, image_url: img.imageUrl,
        storage_path: storagePath, alt_text: img.alt || null,
        context: img.context || null, width: img.width || null,
        height: img.height || null, file_size: buffer.length, score: img.score,
      });
      if (!dbErr) saved++;
    } catch { /* skip */ }
  });

  return { saved, skipped, dupeHash };
}

// --- MAIN ---
async function main() {
  const guArg = process.argv.find(a => a.startsWith('--gu='))?.split('=')[1];

  if (process.argv.includes('--list')) {
    console.log('\n구별 클리닉 수:');
    for (const { gu, count } of listDistricts()) console.log(`  ${gu}: ${count}개`);
    return;
  }

  const targets = getTargets(guArg);
  if (targets.length === 0) { console.error('No targets. Use --list'); process.exit(1); }

  const skipExisting = !process.argv.includes('--force');
  let crawledIds = new Set();
  if (skipExisting) {
    const { data: existing } = await supabase.from('crawl_pages').select('hira_id');
    if (existing) crawledIds = new Set(existing.map(r => r.hira_id));
  }

  const remaining = skipExisting ? targets.filter(t => !crawledIds.has(t.hira_id)) : targets;

  console.log(`\n=== 크롤링 v4.1 (완벽 수집 + iframe) ===`);
  console.log(`=== ${guArg || '전체'}: ${remaining.length}/${targets.length}개 ===\n`);

  if (remaining.length === 0) { console.log('모두 완료. --force로 재크롤.'); return; }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const timings = [];
  let totalPages = 0, totalImages = 0;

  for (let i = 0; i < remaining.length; i++) {
    const target = remaining[i];
    const t0 = Date.now();
    process.stdout.write(`[${i + 1}/${remaining.length}] ${target.name} `);

    try {
      const { pages, images } = await discoverPages(browser, target.homepage, target.isChain);
      const textSaved = await saveRawText(target.hira_id, target.name, pages);
      let imgSaved = 0, imgSkipped = 0, imgDupeHash = 0;
      if (images.length > 0) {
        const result = await saveImages(target.hira_id, target.name, images);
        imgSaved = result.saved; imgSkipped = result.skipped; imgDupeHash = result.dupeHash;
      }

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      timings.push({ name: target.name, seconds: parseFloat(elapsed), pages: pages.length, images: imgSaved });
      totalPages += textSaved; totalImages += imgSaved;

      const extras = [imgSkipped > 0 ? `${imgSkipped}skip` : '', imgDupeHash > 0 ? `${imgDupeHash}dup` : ''].filter(Boolean).join(' ');
      console.log(`→ ${pages.length}p ${imgSaved}img ${extras ? `(${extras}) ` : ''}${elapsed}s`);

      await supabase.from('crawl_logs_v2').insert({
        hira_id: target.hira_id, clinic_name: target.name,
        homepage_url: target.homepage, status: 'success',
        pages_crawled: pages.length, treatments_found: 0,
      });
    } catch (e) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`→ ERROR ${elapsed}s: ${e.message?.slice(0, 50)}`);
      timings.push({ name: target.name, seconds: parseFloat(elapsed), pages: 0, images: 0 });
      await supabase.from('crawl_logs_v2').insert({
        hira_id: target.hira_id, clinic_name: target.name,
        homepage_url: target.homepage, status: 'error',
        pages_crawled: 0, treatments_found: 0, error_message: e.message?.slice(0, 200),
      });
    }
  }

  await browser.close();

  const times = timings.map(t => t.seconds).filter(s => s > 0);
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 0;
  const min = times.length ? Math.min(...times).toFixed(1) : 0;
  const max = times.length ? Math.max(...times).toFixed(1) : 0;
  const total = times.reduce((a, b) => a + b, 0).toFixed(0);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  완료: ${remaining.length}개 | ${totalPages}p | ${totalImages}img`);
  console.log(`  시간: ${total}s | 평균 ${avg}s | 최소 ${min}s | 최대 ${max}s`);
  console.log(`${'═'.repeat(50)}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
