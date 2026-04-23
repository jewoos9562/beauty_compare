#!/usr/bin/env node

/**
 * 크롤링 파이프라인 v3
 *
 * - raw_text + images 수집 (API 비용 0원)
 * - 이미지 URL 정규화로 중복 제거
 * - 이미지 병렬 다운로드 (5개씩)
 * - 페이지 대기시간 최적화
 * - 클리닉별 소요시간 측정
 *
 * Usage:
 *   node crawl.mjs --gu=광진구         # 광진구만
 *   node crawl.mjs                     # 전체
 *   node crawl.mjs --force --gu=광진구  # 기존 데이터 무시하고 재크롤
 *   node crawl.mjs --list              # 구별 클리닉 수 확인
 */

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

// --- CONFIG ---
const PRICE_KEYWORDS = ['가격', '비용', '시술', '이벤트', '프로모션', 'price', 'menu', '메뉴', '상담', '보톡스', '필러', '리프팅', '레이저', '토닝', '스킨부스터', '할인', '특가', '원데이', 'event'];
const IMAGE_KEYWORDS = ['가격', '비용', '시술', '이벤트', '프로모션', 'price', 'menu', 'event', '할인', '특가', '보톡스', '필러', '리프팅', 'banner', '배너', 'popup', '팝업'];
const MAX_PAGES = 30;           // 페이지 제한 해제 (15 → 30)
const PAGE_TIMEOUT = 20000;     // 20초 (30초에서 줄임)
const PAGE_WAIT = 800;          // 페이지 로드 후 대기 (1500 → 800ms)
const MIN_IMAGE_SIZE = 150;     // 최소 이미지 크기 (200 → 150)
const IMG_CONCURRENCY = 5;      // 이미지 동시 다운로드 수

// --- Helpers ---
function normalizeImgUrl(src) {
  try {
    const u = new URL(src);
    u.search = '';
    u.hash = '';
    return u.href;
  } catch { return src; }
}

/** Run promises in batches of `n` */
async function parallel(items, n, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += n) {
    const batch = items.slice(i, i + n);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// --- STEP 1: Discover pages + images ---
async function discoverPages(browser, homepage, isChain = false) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });
  // Block fonts/media for speed
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (type === 'font' || type === 'media') req.abort();
    else req.continue();
  });

  const visited = new Set();
  const results = [];
  const imageResults = [];
  const seenImages = new Set();
  const baseHost = new URL(homepage).hostname;

  // For chain clinics: restrict link following to branch-specific paths
  const homeUrl = new URL(homepage);
  const homePath = homeUrl.pathname.replace(/\/$/, '');
  const branchSegment = homePath && homePath !== '' && homePath.length > 3
    ? homePath.split('/').filter(Boolean).pop() || ''
    : '';
  // If homepage is a root domain (daybeauclinic04.com), no restriction needed
  // If homepage has a specific path (/cnpskin22, /geondae), only follow links containing that segment
  const restrictLinks = isChain && branchSegment && branchSegment.length > 2;

  async function crawlPage(url, depth) {
    if (visited.size >= MAX_PAGES) return;
    if (visited.has(url) || depth > 2) return;
    visited.add(url);

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
      if (!resp || !resp.ok()) return;

      await new Promise(r => setTimeout(r, PAGE_WAIT));

      const text = await page.evaluate(() => {
        const remove = document.querySelectorAll('script, style, nav, footer, header, .cookie-banner, .chat-widget');
        remove.forEach(el => el.remove());
        return document.body?.innerText?.trim() || '';
      });

      if (text.length > 50) {
        results.push({ url, text });
      }

      // Extract images
      const images = await page.evaluate((minSize, kwList) => {
        const imgs = [];
        for (const img of document.querySelectorAll('img[src]')) {
          const src = img.src;
          if (!src || src.startsWith('data:')) continue;
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          if (w < minSize && h < minSize) continue;

          const alt = (img.alt || '').trim();
          const parentText = (img.parentElement?.innerText || '').trim().slice(0, 200);
          const nearby = (img.closest('section, article, div.event, div.price, div.menu, div.popup, .swiper-slide, .banner')?.innerText || '').trim().slice(0, 300);

          const allText = [src, alt, parentText, nearby].join(' ').toLowerCase();
          let score = 0;
          for (const kw of kwList) {
            if (allText.includes(kw)) score++;
          }
          if (w > 600 || h > 600) score += 1;
          if (w > 1000 || h > 1000) score += 1;

          imgs.push({ src, alt, context: (parentText || nearby).slice(0, 300), w, h, score });
        }
        return imgs;
      }, MIN_IMAGE_SIZE, IMAGE_KEYWORDS);

      for (const img of images) {
        const normUrl = normalizeImgUrl(img.src);
        if (!seenImages.has(normUrl)) {
          seenImages.add(normUrl);
          imageResults.push({
            sourceUrl: url,
            imageUrl: img.src,
            alt: img.alt,
            context: img.context,
            width: img.w,
            height: img.h,
            score: img.score,
          });
        }
      }

      // Find internal links
      if (depth < 2) {
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
            // Chain: only follow links containing branch segment
            if (restrictLinks && !l.includes(branchSegment)) return false;
            return true;
          })
          .map(link => {
            const lower = link.toLowerCase();
            const score = PRICE_KEYWORDS.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
            return { link, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);

        for (const { link } of scored) {
          await crawlPage(link, depth + 1);
        }
      }
    } catch (e) {
      // Skip silently
    }
  }

  await crawlPage(homepage, 0);
  await page.close();
  return { pages: results, images: imageResults };
}

// --- STEP 2: Save raw text ---
async function saveRawText(hiraId, clinicName, pages) {
  if (pages.length === 0) return 0;

  await supabase.from('crawl_pages').delete().eq('hira_id', hiraId);

  const rows = pages.map(p => ({
    hira_id: hiraId,
    clinic_name: clinicName,
    url: p.url,
    raw_text: p.text,
    char_count: p.text.length,
  }));

  const { error } = await supabase.from('crawl_pages').insert(rows);
  if (error) {
    console.error('  [db] crawl_pages error:', error.message?.slice(0, 60));
    return 0;
  }
  return rows.length;
}

// --- STEP 3: Save images (parallel download) ---
async function saveImages(hiraId, clinicName, images) {
  if (images.length === 0) return 0;

  // Check existing to avoid duplicates
  const { data: existing } = await supabase
    .from('crawl_images')
    .select('image_url')
    .eq('hira_id', hiraId);
  const existingUrls = new Set((existing || []).map(e => e.image_url));

  const newImages = images.filter(img => !existingUrls.has(img.imageUrl));
  const skipped = images.length - newImages.length;

  let saved = 0;

  await parallel(newImages, IMG_CONCURRENCY, async (img) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(img.imageUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
      });
      clearTimeout(timeout);

      if (!resp.ok) return;
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) return;

      const buffer = Buffer.from(await resp.arrayBuffer());
      if (buffer.length < 5000) return;

      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const storagePath = `${hiraId.slice(0, 20)}/${Date.now()}-${saved}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('crawl-images')
        .upload(storagePath, buffer, { contentType, upsert: false });
      if (uploadErr) return;

      const { error: dbErr } = await supabase.from('crawl_images').insert({
        hira_id: hiraId,
        clinic_name: clinicName,
        source_url: img.sourceUrl,
        image_url: img.imageUrl,
        storage_path: storagePath,
        alt_text: img.alt || null,
        context: img.context || null,
        width: img.width || null,
        height: img.height || null,
        file_size: buffer.length,
        score: img.score,
      });
      if (!dbErr) saved++;
    } catch {
      // Skip
    }
  });

  return { saved, skipped };
}

// --- MAIN ---
async function main() {
  const guArg = process.argv.find(a => a.startsWith('--gu='))?.split('=')[1];

  if (process.argv.includes('--list')) {
    console.log('\n구별 홈페이지 있는 클리닉 수:');
    for (const { gu, count } of listDistricts()) {
      console.log(`  ${gu}: ${count}개`);
    }
    return;
  }

  const targets = getTargets(guArg);
  if (targets.length === 0) {
    console.error(`No targets found. Use --list to see districts.`);
    process.exit(1);
  }

  const skipExisting = !process.argv.includes('--force');
  let crawledIds = new Set();
  if (skipExisting) {
    const { data: existing } = await supabase.from('crawl_pages').select('hira_id');
    if (existing) crawledIds = new Set(existing.map(r => r.hira_id));
  }

  const remaining = skipExisting ? targets.filter(t => !crawledIds.has(t.hira_id)) : targets;

  console.log(`\n=== 크롤링 시작 ===`);
  console.log(`=== ${guArg || '전체'}: ${remaining.length}/${targets.length}개 클리닉 ===\n`);

  if (remaining.length === 0) {
    console.log('모든 클리닉 크롤 완료. --force로 재크롤 가능.');
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const timings = [];
  let totalPages = 0;
  let totalImages = 0;

  for (let i = 0; i < remaining.length; i++) {
    const target = remaining[i];
    const t0 = Date.now();

    process.stdout.write(`[${i + 1}/${remaining.length}] ${target.name} `);

    try {
      const { pages, images } = await discoverPages(browser, target.homepage, target.isChain);

      const textSaved = await saveRawText(target.hira_id, target.name, pages);
      let imgSaved = 0, imgSkipped = 0;
      if (images.length > 0) {
        const result = await saveImages(target.hira_id, target.name, images);
        imgSaved = result.saved;
        imgSkipped = result.skipped;
      }

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      timings.push({ name: target.name, seconds: parseFloat(elapsed), pages: pages.length, images: imgSaved });
      totalPages += textSaved;
      totalImages += imgSaved;

      console.log(`→ ${pages.length}p ${imgSaved}img ${imgSkipped > 0 ? `(${imgSkipped}skip) ` : ''}${elapsed}s`);

      await supabase.from('crawl_logs_v2').insert({
        hira_id: target.hira_id,
        clinic_name: target.name,
        homepage_url: target.homepage,
        status: 'success',
        pages_crawled: pages.length,
        treatments_found: 0,
        error_message: null,
      });

    } catch (e) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`→ ERROR ${elapsed}s: ${e.message?.slice(0, 50)}`);
      timings.push({ name: target.name, seconds: parseFloat(elapsed), pages: 0, images: 0 });

      await supabase.from('crawl_logs_v2').insert({
        hira_id: target.hira_id,
        clinic_name: target.name,
        homepage_url: target.homepage,
        status: 'error',
        pages_crawled: 0,
        treatments_found: 0,
        error_message: e.message?.slice(0, 200),
      });
    }
  }

  await browser.close();

  // --- Stats ---
  const times = timings.map(t => t.seconds).filter(s => s > 0);
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 0;
  const min = times.length ? Math.min(...times).toFixed(1) : 0;
  const max = times.length ? Math.max(...times).toFixed(1) : 0;
  const total = times.reduce((a, b) => a + b, 0).toFixed(0);
  const fastest = timings.filter(t => t.pages > 0).sort((a, b) => a.seconds - b.seconds)[0];
  const slowest = timings.filter(t => t.pages > 0).sort((a, b) => b.seconds - a.seconds)[0];

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  완료: ${remaining.length}개 클리닉`);
  console.log(`  페이지: ${totalPages} | 이미지: ${totalImages}`);
  console.log(`  총 시간: ${total}s | 평균: ${avg}s | 최소: ${min}s | 최대: ${max}s`);
  if (fastest) console.log(`  최빠름: ${fastest.name} (${fastest.seconds}s, ${fastest.pages}p)`);
  if (slowest) console.log(`  최느림: ${slowest.name} (${slowest.seconds}s, ${slowest.pages}p)`);
  console.log(`${'═'.repeat(50)}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
