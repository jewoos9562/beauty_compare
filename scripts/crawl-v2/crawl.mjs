#!/usr/bin/env node

/**
 * 크롤링 파이프라인 v2
 *
 * 1. Puppeteer로 홈페이지 + 내부 링크 탐색 (가격/시술/이벤트 관련 페이지)
 * 2. 각 페이지의 텍스트 추출
 * 3. Claude API로 시술/가격 파싱 (마스터 데이터 참조)
 * 4. Supabase crawl_treatments에 저장
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { TARGETS } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const masterTreatments = JSON.parse(fs.readFileSync(path.join(__dirname, 'master-treatments.json'), 'utf8'));

// --- ENV ---
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- CONSTANTS ---
const PRICE_KEYWORDS = ['가격', '비용', '시술', '이벤트', '프로모션', 'price', 'menu', '메뉴', '상담', '보톡스', '필러', '리프팅', '레이저', '토닝', '스킨부스터', '할인', '특가', '원데이', 'event'];
const IMAGE_KEYWORDS = ['가격', '비용', '시술', '이벤트', '프로모션', 'price', 'menu', 'event', '할인', '특가', '보톡스', '필러', '리프팅', 'banner', '배너', 'popup', '팝업'];
const MAX_PAGES_PER_CLINIC = 15;
const CRAWL_TIMEOUT = 30000;
const MIN_IMAGE_SIZE = 200; // px — 아이콘/로고 제외

// --- STEP 1: Discover & extract pages ---
async function discoverPages(browser, homepage) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });

  const visited = new Set();
  const results = []; // { url, text }
  const imageResults = []; // { sourceUrl, imageUrl, alt, context, width, height, score }
  const seenImages = new Set();
  const baseHost = new URL(homepage).hostname;

  async function crawlPage(url, depth) {
    if (visited.size >= MAX_PAGES_PER_CLINIC) return;
    if (visited.has(url) || depth > 2) return;
    visited.add(url);

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CRAWL_TIMEOUT });
      if (!resp || !resp.ok()) return;

      // Wait for dynamic content
      await new Promise(r => setTimeout(r, 1500));

      // Extract text content
      const text = await page.evaluate(() => {
        // Remove scripts, styles, nav, footer
        const remove = document.querySelectorAll('script, style, nav, footer, header, .cookie-banner, .chat-widget');
        remove.forEach(el => el.remove());
        return document.body?.innerText?.trim() || '';
      });

      if (text.length > 100) {
        results.push({ url, text: text.slice(0, 15000) }); // Cap at 15k chars
        console.log(`  [page] ${url} (${text.length} chars)`);
      }

      // Extract images with context
      const images = await page.evaluate((minSize, kwList) => {
        const imgs = [];
        for (const img of document.querySelectorAll('img[src]')) {
          const src = img.src;
          if (!src || src.startsWith('data:')) continue;
          const w = img.naturalWidth || img.width || 0;
          const h = img.naturalHeight || img.height || 0;
          if (w < minSize && h < minSize) continue; // skip tiny icons

          // Gather context: alt, parent text, nearby text
          const alt = (img.alt || '').trim();
          const parentText = (img.parentElement?.innerText || '').trim().slice(0, 200);
          const nearby = (img.closest('section, article, div.event, div.price, div.menu, div.popup, .swiper-slide, .banner')?.innerText || '').trim().slice(0, 300);

          // Score: how likely this image contains price/treatment info
          const allText = [src, alt, parentText, nearby].join(' ').toLowerCase();
          let score = 0;
          for (const kw of kwList) {
            if (allText.includes(kw)) score++;
          }

          // Large images are more likely to be content (not decorative)
          if (w > 600 || h > 600) score += 1;
          if (w > 1000 || h > 1000) score += 1;

          imgs.push({ src, alt, context: (parentText || nearby).slice(0, 300), w, h, score });
        }
        return imgs;
      }, MIN_IMAGE_SIZE, IMAGE_KEYWORDS);

      for (const img of images) {
        if (!seenImages.has(img.src)) {
          seenImages.add(img.src);
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
          return [...document.querySelectorAll('a[href]')]
            .map(a => a.href)
            .filter(href => {
              try {
                const u = new URL(href);
                return u.hostname === host || u.hostname.endsWith('.' + host);
              } catch { return false; }
            });
        }, baseHost);

        // Score links by keyword relevance
        const scored = links.map(link => {
          const lower = link.toLowerCase();
          const score = PRICE_KEYWORDS.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
          return { link, score };
        }).filter(l => l.score > 0 || !visited.has(l.link))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        for (const { link } of scored) {
          await crawlPage(link, depth + 1);
        }
      }
    } catch (e) {
      console.log(`  [skip] ${url}: ${e.message?.slice(0, 80)}`);
    }
  }

  await crawlPage(homepage, 0);
  await page.close();
  return { pages: results, images: imageResults };
}

// --- STEP 1.5: Save images to Supabase Storage + DB ---
async function saveImages(hiraId, clinicName, images) {
  if (images.length === 0) return 0;

  // Sort by score descending — high score = more likely price-related
  const sorted = images.sort((a, b) => b.score - a.score);
  let saved = 0;

  for (const img of sorted) {
    try {
      // Download image
      const resp = await fetch(img.imageUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
      });
      if (!resp.ok) continue;

      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) continue;

      const buffer = Buffer.from(await resp.arrayBuffer());
      const fileSize = buffer.length;

      // Skip very small files (likely 1px trackers)
      if (fileSize < 5000) continue;

      // Upload to Storage
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const storagePath = `${hiraId.slice(0, 20)}/${Date.now()}-${saved}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('crawl-images')
        .upload(storagePath, buffer, { contentType, upsert: false });

      if (uploadErr) {
        console.log(`  [img skip] upload error: ${uploadErr.message?.slice(0, 60)}`);
        continue;
      }

      // Save metadata to DB
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
        file_size: fileSize,
        score: img.score,
      });

      if (dbErr) {
        console.log(`  [img skip] db error: ${dbErr.message?.slice(0, 60)}`);
        continue;
      }

      saved++;
    } catch (e) {
      // Skip failed downloads silently
    }
  }

  return saved;
}

// --- STEP 2: Parse treatments with Claude ---
async function parseTreatments(clinicName, pages) {
  const masterSummary = masterTreatments.map(t =>
    `${t.category} > ${t.subcategory} > ${t.name_ko} (${t.standard_name}) [${t.unit}] 키워드: ${t.keywords}`
  ).join('\n');

  const pageTexts = pages.map((p, i) =>
    `=== 페이지 ${i + 1}: ${p.url} ===\n${p.text}`
  ).join('\n\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `당신은 한국 피부과/미용의원의 웹사이트에서 시술 가격 정보를 추출하는 전문가입니다.

## 마스터 시술 데이터 (참고용 — 시술 분류에 사용)
${masterSummary}

## 병원: ${clinicName}

## 크롤링된 웹페이지 텍스트
${pageTexts}

## 작업
위 텍스트에서 시술명과 가격 정보를 추출하세요.

## 출력 형식 (JSON array만, 다른 텍스트 없이)
\`\`\`json
[
  {
    "treatment_name": "시술명 (원본 그대로)",
    "category": "마스터 데이터 기준 카테고리 (필러/보톡스/리프팅/피부/바디/제모/기타)",
    "subcategory": "마스터 데이터 기준 서브카테고리",
    "standard_name": "마스터 데이터에 매칭되는 표준 시술명 (없으면 null)",
    "orig_price": 정가(숫자, 없으면 null),
    "event_price": 이벤트/할인가(숫자, 없으면 null),
    "volume_or_count": "용량/횟수 (예: 1cc, 100U, 300샷, 1회)",
    "area": "시술 부위 (예: 얼굴, 턱, 이마)",
    "notes": "브랜드/추가 정보",
    "source_url": "해당 정보가 있던 페이지 URL"
  }
]
\`\`\`

## 규칙
- 가격이 명확하지 않은 항목(가격문의, 상담 후 결정)은 orig_price와 event_price를 null로
- 가격 단위: 원 (10,000원 → 10000)
- "~" 등 범위가 있으면 낮은 가격을 event_price에
- 텍스트에서 가격 정보가 전혀 없으면 빈 배열 []
- 중복 제거: 같은 시술+같은 가격은 하나만
- JSON만 출력하세요. 설명이나 마크다운 없이.`
    }]
  });

  const text = response.content[0].text;
  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.log('  [warn] No JSON found in Claude response');
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log('  [warn] JSON parse error:', e.message);
    return [];
  }
}

// --- STEP 3: Save to Supabase ---
async function saveTreatments(hiraId, clinicName, treatments) {
  if (treatments.length === 0) return 0;

  const rows = treatments.map(t => ({
    hira_id: hiraId,
    clinic_name: clinicName,
    category: t.category || null,
    subcategory: t.subcategory || null,
    treatment_name: t.treatment_name,
    standard_name: t.standard_name || null,
    orig_price: t.orig_price || null,
    event_price: t.event_price || null,
    volume_or_count: t.volume_or_count || null,
    area: t.area || null,
    notes: t.notes || null,
    source_url: t.source_url || null,
  }));

  const { error } = await supabase.from('crawl_treatments').insert(rows);
  if (error) {
    console.error('  [db error]', error.message);
    return 0;
  }
  return rows.length;
}

async function logCrawl(hiraId, clinicName, homepage, status, pagesCrawled, treatmentsFound, errorMsg) {
  await supabase.from('crawl_logs_v2').insert({
    hira_id: hiraId,
    clinic_name: clinicName,
    homepage_url: homepage,
    status,
    pages_crawled: pagesCrawled,
    treatments_found: treatmentsFound,
    error_message: errorMsg || null,
  });
}

// --- MAIN ---
async function main() {
  const targetIdx = parseInt(process.argv[2]);
  const targets = targetIdx >= 0 ? [TARGETS[targetIdx]] : TARGETS;

  console.log(`\n=== 크롤링 시작: ${targets.length}개 클리닉 ===\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  for (const target of targets) {
    console.log(`\n[${target.name}] ${target.homepage}`);

    try {
      // Step 1: Discover pages + images
      console.log('  Step 1: 페이지 + 이미지 탐색...');
      const { pages, images } = await discoverPages(browser, target.homepage);
      console.log(`  → ${pages.length}개 페이지, ${images.length}개 이미지 후보 수집`);

      // Step 1.5: Save images to Storage + DB
      if (images.length > 0) {
        console.log('  Step 1.5: 이미지 저장...');
        const imgSaved = await saveImages(target.hira_id, target.name, images);
        console.log(`  → ${imgSaved}/${images.length}개 이미지 저장 (score순 정렬)`);
      }

      if (pages.length === 0) {
        console.log('  → 텍스트 페이지 없음');
        await logCrawl(target.hira_id, target.name, target.homepage, 'partial', 0, 0, `images: ${images.length}, text pages: 0`);
        continue;
      }

      // Step 2: Parse with Claude
      console.log('  Step 2: Claude API로 시술/가격 파싱...');
      const treatments = await parseTreatments(target.name, pages);
      console.log(`  → ${treatments.length}개 시술 추출`);

      // Step 3: Save to DB
      console.log('  Step 3: DB 저장...');
      const saved = await saveTreatments(target.hira_id, target.name, treatments);
      console.log(`  → ${saved}건 저장 완료`);

      await logCrawl(target.hira_id, target.name, target.homepage, 'success', pages.length, saved, null);

      // Save raw JSON locally too
      const outPath = path.join(__dirname, `result-${target.name}.json`);
      fs.writeFileSync(outPath, JSON.stringify(treatments, null, 2), 'utf8');
      console.log(`  → 로컬 저장: ${outPath}`);

    } catch (e) {
      console.error(`  [ERROR] ${e.message}`);
      await logCrawl(target.hira_id, target.name, target.homepage, 'error', 0, 0, e.message);
    }
  }

  await browser.close();
  console.log('\n=== 완료 ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
