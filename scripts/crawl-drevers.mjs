/**
 * 닥터에버스 (Dr.Evers) 크롤러
 * 공식 홈페이지에서 서울 전 지점 가격 데이터 수집
 *
 * Usage:
 *   node scripts/crawl-drevers.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-drevers.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-drevers.mjs --branch 19  # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── 닥터에버스 서울 지점 목록 ──────────────────────────────────────
const SEOUL_BRANCHES = [
  { number: 3,  name: '닥터에버스 서울대입구점', district: 'gwanak',      address: '서울 관악구' },
  { number: 4,  name: '닥터에버스 노원점',       district: 'nowon',       address: '서울 노원구' },
  { number: 10, name: '닥터에버스 목동점',       district: 'yangcheon',   address: '서울 양천구' },
  { number: 12, name: '닥터에버스 홍대점',       district: 'mapo',        address: '서울 마포구' },
  { number: 13, name: '닥터에버스 잠실점',       district: 'songpa',      address: '서울 송파구' },
  { number: 15, name: '닥터에버스 청담점',       district: 'gangnam',     address: '서울 강남구' },
  { number: 16, name: '닥터에버스 공덕점',       district: 'mapo',        address: '서울 마포구' },
  { number: 19, name: '닥터에버스 강남점',       district: 'gangnam',     address: '서울 강남구' },
  { number: 20, name: '닥터에버스 명동점',       district: 'jung',        address: '서울 중구' },
  { number: 22, name: '닥터에버스 구로점',       district: 'guro',        address: '서울 구로구' },
  { number: 25, name: '닥터에버스 건대점',       district: 'gwangjin',    address: '서울 광진구' },
  { number: 27, name: '닥터에버스 천호점',       district: 'gangdong',    address: '서울 강동구' },
  { number: 28, name: '닥터에버스 청량리점',     district: 'dongdaemun',  address: '서울 동대문구' },
];

// ── 이벤트 페이지 경로 목록 ───────────────────────────────────────
const EVENT_PATHS = ['/event20041', '/event2004', '/event2005', '/event2006'];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
const CATEGORY_TAG_MAP = {
  '보톡스': 'botox',
  '윤곽주사': 'botox',
  '보톡스/윤곽주사': 'botox',
  '필러': 'filler',
  '실리프팅': 'filler',
  '필러/실리프팅': 'filler',
  '레이저리프팅': 'lifting',
  '리프팅': 'lifting',
  '울쎄라': 'lifting',
  '써마지': 'lifting',
  '슈링크': 'lifting',
  '인모드': 'lifting',
  '스킨부스터': 'skinbooster',
  '줄기세포': 'skinbooster',
  '주사': 'skinbooster',
  '제모': 'hair_removal',
  '레이저제모': 'hair_removal',
  '스킨케어': 'skincare',
  '여드름': 'skincare',
  '피부관리': 'skincare',
  '모공': 'skincare',
  '색소': 'laser',
  '기미': 'laser',
  '레이저': 'laser',
  '토닝': 'laser',
  '미백': 'laser',
  '홍조': 'laser',
  '다이어트': 'body',
  '비만': 'body',
  '체형': 'body',
  '지방분해': 'body',
  '쁘띠성형': 'filler',
  '수액': null,
  '반영구': null,
};

function guessTag(categoryName) {
  if (!categoryName) return null;
  // exact match first
  if (CATEGORY_TAG_MAP[categoryName] !== undefined) return CATEGORY_TAG_MAP[categoryName];
  // partial match
  for (const [key, tag] of Object.entries(CATEGORY_TAG_MAP)) {
    if (categoryName.includes(key)) return tag;
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
async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ── imweb 테이블 기반 시술 항목 파싱 ──────────────────────────────
// Structure: each .text-table with a <table> contains one treatment group.
// Inside the single <td>, children alternate between:
//   - LEFT-aligned <p>/<div>: sub-treatment name (e.g., "주름보톡스(1부위)")
//   - description lines starting with ":" (skip)
//   - RIGHT-aligned <div>: price row "(type) 1회 <s>origPrice</s> <strong>eventPrice</strong>원"
function parseTreatmentsFromTable($, table) {
  const items = [];
  const $table = $(table);
  const cell = $table.find('td').first();
  if (!cell.length) return items;

  // Get the main category name from the first large strong
  const mainNameEl = cell.find('strong span[style*="font-size: 22px"]').first();
  let mainName = mainNameEl.text().trim();
  // Clean up main name
  mainName = mainName.replace(/\s*카톡친구\s*추가/g, '').trim();

  let currentSubName = '';

  cell.children().each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const text = $el.text().trim();
    if (!text) return;

    const isRight = style.includes('text-align: right');

    if (isRight) {
      // Price row: extract type, original price (<s>), and event price (last red <strong>)
      const typeMatch = text.match(/^\(([^)]+)\)/);
      const type = typeMatch ? typeMatch[1] : '';

      // Original price from <s> tag
      const sText = $el.find('s').text().trim();
      const origPrice = parsePrice(sText);

      // Event price: the last <strong> containing a red-colored span with digits
      // Pattern: <strong><span style="color: rgb(252, 4, 4);">7,500</span></strong>원
      let eventPrice = null;
      const strongEls = $el.find('strong');
      strongEls.each((_, s) => {
        const sSpan = $(s).find('span[style*="color: rgb(252"]').text().trim();
        const price = parsePrice(sSpan);
        if (price) eventPrice = price;
      });

      // Fallback: parse event price from text after <s> tag
      if (!eventPrice) {
        // Text pattern: "(type) 1회 14,700원  7,500원"
        // The last number is the event price
        const allPrices = text.match(/[\d,]+/g);
        if (allPrices && allPrices.length >= 1) {
          eventPrice = parsePrice(allPrices[allPrices.length - 1]);
        }
      }

      if (eventPrice) {
        const baseName = currentSubName || mainName || '시술';
        const fullName = type ? `${baseName} (${type})` : baseName;
        items.push({
          name: fullName,
          orig: origPrice && origPrice !== eventPrice ? origPrice : null,
          event: eventPrice,
        });
      }
    } else {
      // Left-aligned: could be a sub-treatment name or description
      // Skip descriptions (start with ":")
      // Skip lines that are purely informational (시술가능부위>, ※)
      if (text.startsWith(':') || text.startsWith('※')) return;
      if (text.startsWith('시술가능부위')) return;

      // Check if this looks like a treatment name (not a description)
      // Names are typically short and contain Korean treatment terms
      const cleanText = text.replace(/:.*$/, '').trim();
      if (cleanText && cleanText.length < 80 && !cleanText.match(/^[a-zA-Z\s]+$/)) {
        currentSubName = cleanText;
      }
    }
  });

  return items;
}

// ── 페이지에서 카테고리별 시술 항목 파싱 ──────────────────────────
function parseSections(html) {
  const $ = cheerio.load(html);
  const sections = [];

  // Each .text-table containing a <table> is one treatment group
  // The heading .text-table without a table (but with bold text like "보톡스") precedes groups
  let currentCategoryName = null;
  let currentCategoryItems = [];

  $('.text-table').each((_, div) => {
    const $div = $(div);
    const table = $div.find('table');
    const text = $div.text().trim();

    // Skip navigation/language headers
    if (text.includes('Language') || text.includes('English')) return;
    if (text.includes('Dr.Evers')) return;

    // Check if this text-table has price data (contains <s> tags = strikethrough prices)
    const hasPriceData = $div.find('s').length > 0;

    if (!hasPriceData) {
      // This is a category heading (e.g., "보톡스  카톡친구 추가")
      // Skip branch selectors (long text with multiple branch names)
      if (text.length > 40) return;

      const heading = text.replace(/\s*카톡친구\s*추가/g, '').trim();
      if (heading && heading.length < 40) {
        // Save previous category if it had items
        if (currentCategoryName && currentCategoryItems.length > 0) {
          sections.push({ name: currentCategoryName, items: [...currentCategoryItems] });
        }
        currentCategoryName = heading;
        currentCategoryItems = [];
      }
      return;
    }

    // This text-table has price data - parse treatments from the table
    if (table.length) {
      const items = parseTreatmentsFromTable($, table);
      if (items.length > 0) {
        currentCategoryItems.push(...items);
      }
    }
  });

  // Don't forget the last category
  if (currentCategoryName && currentCategoryItems.length > 0) {
    sections.push({ name: currentCategoryName, items: currentCategoryItems });
  }

  // If no categories were found but we have items, group them all
  if (sections.length === 0) {
    const allItems = [];
    $('table').each((_, table) => {
      allItems.push(...parseTreatmentsFromTable($, table));
    });
    if (allItems.length > 0) {
      sections.push({ name: '시술 항목', items: allItems });
    }
  }

  return sections;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  const baseUrl = `https://evers${branch.number}.co.kr`;
  console.log(`\n🔍 ${branch.name} (${baseUrl})`);

  const allSections = [];
  const seenNames = new Set();

  for (const path of EVENT_PATHS) {
    const url = `${baseUrl}${path}`;
    try {
      await new Promise(r => setTimeout(r, 500)); // polite delay
      const html = await fetchPage(url);
      const sections = parseSections(html);

      for (const section of sections) {
        // Deduplicate items across pages
        const newItems = section.items.filter(item => {
          const key = `${item.name}_${item.event}`;
          if (seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        });

        if (newItems.length > 0) {
          // Check if we already have this section name
          const existing = allSections.find(s => s.name === section.name);
          if (existing) {
            existing.items.push(...newItems);
          } else {
            allSections.push({ name: section.name, items: newItems });
          }
        }
      }

      if (sections.length > 0) {
        const count = sections.reduce((s, sec) => s + sec.items.length, 0);
        console.log(`  ✓ ${path}: ${count}개 항목`);
      } else {
        console.log(`  - ${path}: 항목 없음`);
      }
    } catch (e) {
      console.log(`  - ${path}: 접근 불가 (${e.message})`);
    }
  }

  if (allSections.length === 0) {
    console.log(`  ⚠ 시술 항목을 찾을 수 없습니다`);
    return null;
  }

  // Map sections to categories with tags
  const categories = allSections.map(section => ({
    name: section.name,
    tag: guessTag(section.name),
    items: section.items,
  }));

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  console.log(`  📋 카테고리 ${categories.length}개, 총 ${totalItems}개 시술`);

  return {
    clinic: {
      id: `drevers_${branch.number}`,
      district_id: branch.district,
      name: branch.name,
      address: branch.address,
      phone: '',
      note: 'VAT 별도',
      color: 'from-emerald-500 to-teal-400',
    },
    categories,
  };
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
    branches = branches.filter(b => String(b.number) === branchFilter);
    if (branches.length === 0) {
      console.error(`❌ 지점 '${branchFilter}'을 찾을 수 없습니다`);
      console.log('사용 가능한 지점:', SEOUL_BRANCHES.map(b => `${b.number}(${b.name})`).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 닥터에버스 크롤링 시작 (${branches.length}개 지점) ===`);

  const results = [];
  for (const branch of branches) {
    try {
      const data = await crawlBranch(branch);
      if (data && data.categories.length > 0) {
        results.push(data);
      }
    } catch (e) {
      console.error(`  ❌ ${branch.name} 크롤링 실패: ${e.message}`);
    }
  }

  console.log(`\n=== 크롤링 완료: ${results.length}/${branches.length} 지점 성공 ===`);

  // summary
  let totalItems = 0;
  for (const r of results) {
    const count = r.categories.reduce((sum, c) => sum + c.items.length, 0);
    totalItems += count;
    console.log(`  ${r.clinic.name}: ${r.categories.length}개 카테고리, ${count}개 시술`);
  }
  console.log(`  총 ${totalItems}개 시술 항목 수집`);

  if (shouldSeed) {
    console.log('\n=== Supabase 시드 시작 ===');
    await seedToSupabase(results);
    console.log('=== 시드 완료 ===');
  } else {
    // output JSON
    const outputPath = './crawl-results-drevers.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
