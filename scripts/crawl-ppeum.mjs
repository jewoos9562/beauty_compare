/**
 * 예쁨주의쁨의원 (Ppeum Clinic) 크롤러
 * 공식 홈페이지에서 서울 지점 가격 데이터 수집
 *
 * Usage:
 *   node scripts/crawl-ppeum.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-ppeum.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-ppeum.mjs --branch gangnam  # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── 예쁨주의쁨의원 서울 지점 목록 ─────────────────────────────────
const SEOUL_BRANCHES = [
  { subdomain: 'sinnonhyeon', name: '예쁨주의쁨의원 강남본점', district: 'gangnam',   address: '서울 강남구' },
  { subdomain: 'jamsil',      name: '예쁨주의쁨의원 잠실점',   district: 'songpa',    address: '서울 송파구' },
  { subdomain: 'konkukuniv',  name: '예쁨주의쁨의원 건대점',   district: 'gwangjin',  address: '서울 광진구' },
];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
const CATEGORY_TAG_MAP = {
  '이벤트': 'first',
  '보톡스/윤곽주사': 'botox',
  '보톡스': 'botox',
  '윤곽주사': 'botox',
  '필러/실리프팅': 'filler',
  '필러': 'filler',
  '실리프팅': 'filler',
  '리프팅/안티에이징': 'lifting',
  '리프팅': 'lifting',
  '안티에이징': 'lifting',
  '색소/모공/여드름': 'laser',
  '색소': 'laser',
  '모공': 'laser',
  '여드름': 'laser',
  '피부관리/영양주사': 'skincare',
  '피부관리': 'skincare',
  '영양주사': 'skincare',
  '스킨부스터/줄기세포유도인자': 'skinbooster',
  '스킨부스터': 'skinbooster',
  '줄기세포유도인자': 'skinbooster',
  '바디/체형관리': 'body',
  '바디': 'body',
  '체형관리': 'body',
  '고압산소': null,
  '여성제모': 'hair_removal',
  '남성제모': 'hair_removal',
  '옵션상품': null,
};

function guessTag(categoryName) {
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

// ── 시술 항목 파싱 (Ppeum /selectSurgery page) ──────────────────
function parseTreatments(html) {
  const $ = cheerio.load(html);
  const categoryMap = new Map(); // category name -> { tag, items[] }

  // Each product list div has id like "prd_{category}_{subcategory}"
  // Each checkbox input has data-name, data-price, data-fir, data-sec
  $('div.SurgeryItems_surgery-item__CYpPR').each((_, el) => {
    const $el = $(el);
    const $input = $el.find('input[type="checkbox"]');
    if (!$input.length) return;

    const name = $input.attr('data-name');
    const salePrice = parseInt($input.attr('data-price'), 10);
    const firKey = $input.attr('data-fir') || '';
    const secKey = $input.attr('data-sec') || '';

    if (!name || isNaN(salePrice)) return;

    // Original price from span.priceDecoration
    const origPriceText = $el.find('span.priceDecoration').text().trim();
    const origPrice = parsePrice(origPriceText);

    // Current price from first span in div.SelectSurgery_select-box__0sLK7
    const currentPriceText = $el.find('div.SelectSurgery_select-box__0sLK7 span').first().text().trim();
    const currentPrice = parsePrice(currentPriceText);

    // Discount from span.priceOri
    const discountText = $el.find('span.priceOri').text().trim();

    // Determine category from parent div.productList id attribute
    const $productList = $el.closest('div.productList, div[id^="prd_"]');
    let categoryName = firKey;
    if ($productList.length) {
      const prdId = $productList.attr('id') || '';
      const prdMatch = prdId.match(/^prd_(.+?)_(.+)$/);
      if (prdMatch) {
        categoryName = prdMatch[1];
      }
    }

    // Use firKey as category name if we couldn't extract from DOM
    if (!categoryName) categoryName = 'etc';

    // Use the sale price from data-price (most reliable)
    const eventPrice = salePrice || currentPrice;

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        name: categoryName,
        tag: guessTag(categoryName),
        items: [],
      });
    }

    categoryMap.get(categoryName).items.push({
      name,
      orig: origPrice || null,
      event: eventPrice || null,
    });
  });

  // If the checkbox-based approach found nothing, try a broader approach
  // looking at all inputs with data-name/data-price
  if (categoryMap.size === 0) {
    $('input[type="checkbox"][data-name][data-price]').each((_, el) => {
      const $input = $(el);
      const name = $input.attr('data-name');
      const salePrice = parseInt($input.attr('data-price'), 10);
      const firKey = $input.attr('data-fir') || 'etc';

      if (!name || isNaN(salePrice)) return;

      const $parent = $input.closest('div');
      const origPriceText = $parent.find('span.priceDecoration').text().trim();
      const origPrice = parsePrice(origPriceText);

      if (!categoryMap.has(firKey)) {
        categoryMap.set(firKey, {
          name: firKey,
          tag: guessTag(firKey),
          items: [],
        });
      }

      categoryMap.get(firKey).items.push({
        name,
        orig: origPrice || null,
        event: salePrice || null,
      });
    });
  }

  return Array.from(categoryMap.values()).filter(c => c.items.length > 0);
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  const baseUrl = `https://${branch.subdomain}.ppeum.com`;
  console.log(`\n🔍 ${branch.name} (${baseUrl})`);

  // Ppeum has all products on a single /selectSurgery page (SSR)
  const html = await fetchPage(`${baseUrl}/selectSurgery`);
  const categories = parseTreatments(html);

  if (categories.length === 0) {
    console.log(`  ⚠ 시술 항목을 찾을 수 없습니다`);
    return null;
  }

  let totalItems = 0;
  for (const cat of categories) {
    totalItems += cat.items.length;
    console.log(`  ✓ ${cat.name} (${cat.tag || 'none'}): ${cat.items.length}개`);
  }
  console.log(`  📋 카테고리 ${categories.length}개, 총 ${totalItems}개 시술`);

  return {
    clinic: {
      id: `ppeum_${branch.subdomain}`,
      district_id: branch.district,
      name: branch.name,
      address: branch.address,
      phone: '',
      note: 'VAT 포함',
      color: 'from-pink-500 to-rose-400',
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
    branches = branches.filter(b => b.subdomain === branchFilter || b.district === branchFilter);
    if (branches.length === 0) {
      console.error(`❌ 지점 '${branchFilter}'을 찾을 수 없습니다`);
      console.log('사용 가능한 지점:', SEOUL_BRANCHES.map(b => `${b.subdomain} (${b.district})`).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 예쁨주의쁨의원 크롤링 시작 (${branches.length}개 지점) ===`);

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

    // polite delay between branches
    if (branch !== branches[branches.length - 1]) {
      await new Promise(r => setTimeout(r, 500));
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
    const outputPath = './crawl-results-ppeum.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
