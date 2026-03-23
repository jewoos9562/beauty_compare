/**
 * 바로그의원 (Barog Clinic) 크롤러
 * 공식 홈페이지에서 서울 지점 이벤트 이미지 및 가격 데이터 수집
 *
 * Note: 바로그의원은 가격을 이벤트 이미지(PNG)로 제공하며,
 *       anti-bot CUPID cookie 보호가 적용되어 있음.
 *       이미지를 로컬에 저장하여 수동 검토 또는 향후 OCR 처리용으로 사용.
 *
 * Usage:
 *   node scripts/crawl-barog.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-barog.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-barog.mjs --branch gangnam  # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── 바로그의원 서울 지점 목록 ───────────────────────────────────
const SEOUL_BRANCHES = [
  { code: 'br12', name: '바로그의원 강남점',   branch: 'gangnam',    district: 'gangnam',    address: '서울 강남구' },
  { code: 'br06', name: '바로그의원 발산점',   branch: 'balsan',     district: 'gangseo',    address: '서울 강서구' },
  { code: 'br31', name: '바로그의원 연신내점', branch: 'yeonsinnae', district: 'eunpyeong',  address: '서울 은평구' },
];

// ── Event image categories ──────────────────────────────────────
const EVENT_CATEGORIES = ['botox', 'lifting', 'filler', 'skin', 'anti'];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
const CATEGORY_TAG_MAP = {
  'botox': 'botox',
  'lifting': 'lifting',
  'filler': 'filler',
  'skin': 'skincare',
  'anti': 'skinbooster',
};

function guessTag(categoryName) {
  if (!categoryName) return null;
  const lower = categoryName.toLowerCase();
  if (CATEGORY_TAG_MAP[lower] !== undefined) return CATEGORY_TAG_MAP[lower];
  for (const [key, tag] of Object.entries(CATEGORY_TAG_MAP)) {
    if (lower.includes(key)) return tag;
  }
  return null;
}

// ── 가격 파싱 ────────────────────────────────────────────────────
function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
}

// ── HTTP fetch with retry ────────────────────────────────────────
async function fetchPage(url, retries = 3, extraHeaders = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          ...extraHeaders,
        },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { text: await res.text(), headers: res.headers };
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function fetchBinary(url, retries = 3, extraHeaders = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'image/webp,image/png,image/*,*/*',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          ...extraHeaders,
        },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return buf;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ── CUPID cookie solver attempt ─────────────────────────────────
// The site uses a JS challenge (cupid.js) that sets a CUPID cookie via AES.
// Without a full JS engine, we attempt to:
// 1. Fetch the challenge page
// 2. Extract the cookie value if it's set via a simple pattern
// 3. Fall back to direct requests without the cookie
async function trySolveCupid() {
  try {
    console.log('  🔐 CUPID cookie 해결 시도...');
    const { text } = await fetchPage('https://barogclinic.com/');

    // Check if we got a challenge page
    if (text.includes('cupid.js') || text.includes('CUPID')) {
      console.log('  ⚠ Anti-bot challenge 감지. JS 엔진 없이 우회 시도...');

      // Try to extract any cookie hints from the challenge page
      // Look for patterns like document.cookie = "CUPID=..."
      const cookieMatch = text.match(/CUPID[=:]\s*['"]([^'"]+)['"]/);
      if (cookieMatch) {
        console.log('  ✓ CUPID 값 추출 성공');
        return `CUPID=${cookieMatch[1]}`;
      }

      // Try fetching cupid.js for the challenge
      try {
        const { text: cupidJs } = await fetchPage('https://barogclinic.com/cupid.js');
        // Look for static values in the JS
        const valMatch = cupidJs.match(/['"]([a-f0-9]{32,})['"]/);
        if (valMatch) {
          console.log('  ✓ CUPID JS에서 값 추출');
          return `CUPID=${valMatch[1]}`;
        }
      } catch (e) {
        console.log(`  - cupid.js 가져오기 실패: ${e.message}`);
      }

      console.log('  ⚠ CUPID cookie를 자동으로 해결할 수 없음. 직접 이미지 URL 시도...');
      return null;
    }

    // No challenge detected - site might be accessible directly
    console.log('  ✓ Anti-bot challenge 없음');
    return '';
  } catch (e) {
    console.log(`  - CUPID 해결 실패: ${e.message}`);
    return null;
  }
}

// ── Parse event page HTML for any text-based prices ─────────────
function parseEventPage(html) {
  const $ = cheerio.load(html);
  const items = [];
  const eventImages = [];

  // Find event images
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('event') || src.includes('evt') || src.includes('popup') || src.includes('main_evt')) {
      eventImages.push(src);
    }
  });

  // Try to extract any text-based prices
  const priceSelectors = [
    '.event_list li',
    '.evt_list li',
    '.event_item',
    '.price_list li',
    '.sub_event_list li',
    '.menu_list li',
    '.price_table tr',
    'table tr',
  ];

  for (const selector of priceSelectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      const text = $el.text();

      let name = '';
      const titleEl = $el.find('.tit, .title, .name, h3, h4, strong, td:first-child').first();
      if (titleEl.length) {
        name = titleEl.text().trim();
      }

      const priceMatches = text.match(/[\d,]+원/g) || [];
      if (name && priceMatches.length > 0) {
        const prices = priceMatches.map(p => parsePrice(p)).filter(Boolean);
        if (prices.length >= 2) {
          items.push({ name, orig: prices[0], event: prices[1] });
        } else if (prices.length === 1) {
          items.push({ name, orig: null, event: prices[0] });
        }
      }
    });
  }

  return { items, eventImages };
}

// ── Download event images ───────────────────────────────────────
async function downloadEventImages(branchCode, branchName, cupidCookie) {
  const imageDir = join(process.cwd(), 'crawl-images-barog', branchCode);
  if (!existsSync(imageDir)) {
    mkdirSync(imageDir, { recursive: true });
  }

  const downloadedImages = [];
  const headers = cupidCookie ? { 'Cookie': cupidCookie } : {};

  // Try known image URL patterns
  for (const category of EVENT_CATEGORIES) {
    // Try multiple image indices (01 through 10)
    for (let idx = 1; idx <= 10; idx++) {
      const paddedIdx = String(idx).padStart(2, '0');
      const imageUrls = [
        `https://barogclinic.com/img/event/main/${branchCode}/main_evt_${paddedIdx}.png`,
        `https://barogclinic.com/img/event/main/${branchCode}/main_evt_${category}_${paddedIdx}.png`,
        `https://barogclinic.com/img/event/${branchCode}/${category}_${paddedIdx}.png`,
      ];

      for (const imgUrl of imageUrls) {
        try {
          const buf = await fetchBinary(imgUrl, 1, headers);
          if (buf && buf.length > 1000) { // ensure it's a real image, not an error page
            const filename = `${category}_${paddedIdx}.png`;
            const filepath = join(imageDir, filename);
            writeFileSync(filepath, buf);
            downloadedImages.push({ url: imgUrl, path: filepath, category });
            console.log(`    ✓ 이미지 다운로드: ${filename} (${(buf.length / 1024).toFixed(1)}KB)`);
          }
        } catch (e) {
          // Expected - many image indices won't exist
        }
      }
    }
  }

  // Also try generic numbered images
  for (let idx = 1; idx <= 20; idx++) {
    const paddedIdx = String(idx).padStart(2, '0');
    const imgUrl = `https://barogclinic.com/img/event/main/${branchCode}/main_evt_${paddedIdx}.png`;
    // Skip if we already downloaded this URL
    if (downloadedImages.some(d => d.url === imgUrl)) continue;

    try {
      const buf = await fetchBinary(imgUrl, 1, headers);
      if (buf && buf.length > 1000) {
        const filename = `main_evt_${paddedIdx}.png`;
        const filepath = join(imageDir, filename);
        writeFileSync(filepath, buf);
        downloadedImages.push({ url: imgUrl, path: filepath, category: 'unknown' });
        console.log(`    ✓ 이미지 다운로드: ${filename} (${(buf.length / 1024).toFixed(1)}KB)`);
      }
    } catch (e) {
      // Expected
    }
  }

  return downloadedImages;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch, cupidCookie) {
  const baseUrl = 'https://barogclinic.com';
  console.log(`\n🔍 ${branch.name} (${baseUrl}/branch/${branch.code})`);

  const allItems = [];
  let eventImages = [];
  const headers = cupidCookie ? { 'Cookie': cupidCookie } : {};

  // Strategy 1: Try fetching the branch event page for text-based prices
  const eventUrls = [
    `${baseUrl}/branch/${branch.code}/subindex.php`,
    `${baseUrl}/branch/${branch.code}/event.php`,
    `${baseUrl}/branch/${branch.code}/`,
  ];

  for (const eventUrl of eventUrls) {
    try {
      console.log(`  📄 페이지 시도: ${eventUrl}`);
      const { text: html } = await fetchPage(eventUrl, 2, headers);

      // Check if we hit the anti-bot page
      if (html.includes('cupid.js') || (html.length < 2000 && html.includes('CUPID'))) {
        console.log(`  ⚠ Anti-bot challenge 감지 - 이미지 직접 다운로드로 전환`);
        break;
      }

      const parsed = parseEventPage(html);

      if (parsed.items.length > 0) {
        allItems.push(...parsed.items);
        console.log(`  ✓ HTML에서 ${parsed.items.length}개 항목 수집`);
      }

      if (parsed.eventImages.length > 0) {
        eventImages.push(...parsed.eventImages);
        console.log(`  📸 페이지 내 이벤트 이미지 ${parsed.eventImages.length}개 발견`);
      }
    } catch (e) {
      console.log(`  - 페이지 실패: ${e.message}`);
    }
  }

  // Strategy 2: Download event images directly
  console.log(`  📥 이벤트 이미지 직접 다운로드 시도...`);
  const downloadedImages = await downloadEventImages(branch.code, branch.branch, cupidCookie);

  if (downloadedImages.length > 0) {
    console.log(`  ✓ 총 ${downloadedImages.length}개 이미지 다운로드 완료`);
    eventImages.push(...downloadedImages.map(d => d.url));
  }

  // If we found any text-based prices, categorize them
  if (allItems.length > 0) {
    const taggedGroups = new Map();
    for (const item of allItems) {
      const tag = guessTag(item.name) || 'event';
      if (!taggedGroups.has(tag)) {
        taggedGroups.set(tag, []);
      }
      taggedGroups.get(tag).push(item);
    }

    const categories = [];
    for (const [tag, items] of taggedGroups) {
      categories.push({
        name: tag === 'event' ? '이벤트' : tag,
        tag: tag === 'event' ? null : tag,
        items,
      });
    }

    return {
      clinic: {
        id: `barog_${branch.branch}`,
        district_id: branch.district,
        name: branch.name,
        address: branch.address,
        phone: '',
        note: 'VAT 별도',
        color: 'from-sky-500 to-blue-400',
      },
      categories,
      eventImages: eventImages.length > 0 ? [...new Set(eventImages)] : undefined,
      downloadedImages: downloadedImages.length > 0 ? downloadedImages : undefined,
    };
  }

  // Even if no text prices, return info about downloaded images
  if (downloadedImages.length > 0 || eventImages.length > 0) {
    return {
      clinic: {
        id: `barog_${branch.branch}`,
        district_id: branch.district,
        name: branch.name,
        address: branch.address,
        phone: '',
        note: 'VAT 별도',
        color: 'from-sky-500 to-blue-400',
      },
      categories: [],
      eventImages: [...new Set(eventImages)],
      downloadedImages: downloadedImages.length > 0 ? downloadedImages : undefined,
      imageOnly: true,
    };
  }

  console.log(`  ⚠ 수집된 항목 없음`);
  return null;
}

// ── Supabase 시드 ────────────────────────────────────────────────
async function seedToSupabase(data) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opvfdywolzgiqaraoyot.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다');
    process.exit(1);
  }

  for (const { clinic, categories } of data) {
    if (!categories || categories.length === 0) {
      console.log(`  ⚠ ${clinic.name}: 가격 데이터 없음 (이미지만), 시드 건너뜀`);
      continue;
    }

    // ensure district exists
    await supabase.from('districts').upsert(
      { id: clinic.district_id, name: clinic.district_id, active: true },
      { onConflict: 'id' }
    );

    // upsert clinic
    const { error: clinicErr } = await supabase.from('clinics').upsert(clinic, { onConflict: 'id' });
    if (clinicErr) {
      console.error(`  ❌ 병원 upsert 실패 ${clinic.name}: ${clinicErr.message}`);
      continue;
    }
    console.log(`  ✓ 병원: ${clinic.name}`);

    // delete old categories
    await supabase.from('categories').delete().eq('clinic_id', clinic.id);

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .insert({ clinic_id: clinic.id, name: cat.name, tag: cat.tag, sort_order: i + 1 })
        .select('id').single();

      if (catErr) {
        console.error(`    ❌ Category ${cat.name}: ${catErr.message}`);
        continue;
      }

      const treatments = cat.items.map((t, j) => ({
        category_id: catData.id,
        name: t.name,
        orig_price: t.orig ?? null,
        event_price: t.event ?? null,
        base_price: t.base ?? null,
        sort_order: j + 1,
      }));

      const { error: tErr } = await supabase.from('treatments').insert(treatments);
      if (tErr) console.error(`    ❌ Treatments: ${tErr.message}`);
    }

    // log crawl
    await supabase.from('crawl_logs').insert({
      clinic_id: clinic.id,
      status: 'success',
      items_count: categories.reduce((sum, c) => sum + c.items.length, 0),
    });
  }
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');
  const branchFilter = args.includes('--branch') ? args[args.indexOf('--branch') + 1] : null;

  let branches = SEOUL_BRANCHES;
  if (branchFilter) {
    branches = branches.filter(b => b.branch === branchFilter);
    if (branches.length === 0) {
      console.error(`❌ 지점 '${branchFilter}'을 찾을 수 없습니다`);
      console.log('사용 가능한 지점:', SEOUL_BRANCHES.map(b => b.branch).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 바로그의원 크롤링 시작 (${branches.length}개 지점) ===`);

  // Try to solve CUPID cookie first
  const cupidCookie = await trySolveCupid();

  const results = [];
  for (const branch of branches) {
    try {
      const data = await crawlBranch(branch, cupidCookie);
      if (data) {
        results.push(data);
      }
    } catch (e) {
      console.error(`  ❌ ${branch.name} 크롤링 실패: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500)); // polite delay
  }

  console.log(`\n=== 크롤링 완료: ${results.length}/${branches.length} 지점 ===`);

  // summary
  let totalItems = 0;
  let totalImages = 0;
  for (const r of results) {
    const count = r.categories ? r.categories.reduce((sum, c) => sum + c.items.length, 0) : 0;
    const imgCount = r.downloadedImages ? r.downloadedImages.length : 0;
    totalItems += count;
    totalImages += imgCount;
    if (r.imageOnly) {
      console.log(`  ${r.clinic.name}: 이미지만 (${imgCount}개 다운로드, OCR 필요)`);
    } else {
      console.log(`  ${r.clinic.name}: ${r.categories.length}개 카테고리, ${count}개 시술, ${imgCount}개 이미지`);
    }
  }
  console.log(`  총 ${totalItems}개 시술 항목 수집, ${totalImages}개 이미지 다운로드`);

  if (totalImages > 0) {
    console.log(`  📁 이미지 저장 위치: ./crawl-images-barog/`);
    console.log(`  ℹ 이미지에서 가격 추출은 OCR 처리가 필요합니다.`);
  }

  if (shouldSeed) {
    console.log('\n=== Supabase 시드 시작 ===');
    await seedToSupabase(results);
    console.log('=== 시드 완료 ===');
  } else {
    // output JSON
    const outputPath = './crawl-results-barog.json';
    // Remove binary data from JSON output
    const jsonResults = results.map(r => ({
      ...r,
      downloadedImages: r.downloadedImages?.map(d => ({ url: d.url, path: d.path, category: d.category })),
    }));
    writeFileSync(outputPath, JSON.stringify(jsonResults, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
