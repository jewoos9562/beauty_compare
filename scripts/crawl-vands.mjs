/**
 * 밴스의원 (Vands Clinic) 크롤러
 * 공식 홈페이지에서 서울 전 지점 가격 데이터 수집
 *
 * Usage:
 *   node scripts/crawl-vands.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-vands.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-vands.mjs --branch gangnam  # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── 밴스의원 서울 지점 목록 ──────────────────────────────────────
const SEOUL_BRANCHES = [
  { subdomain: 'gangnam',       name: '밴스의원 강남점',     district: 'gangnam',      address: '서울 강남구' },
  { subdomain: 'cheongdam',     name: '밴스의원 청담점',     district: 'gangnam',      address: '서울 강남구' },
  { subdomain: 'sinsa',         name: '밴스의원 신사점',     district: 'gangnam',      address: '서울 강남구' },
  { subdomain: 'samseong',      name: '밴스의원 삼성점',     district: 'gangnam',      address: '서울 강남구' },
  { subdomain: 'yeoksamskin',   name: '밴스의원 역삼점',     district: 'gangnam',      address: '서울 강남구' },
  { subdomain: 'jamsil',        name: '밴스의원 잠실점',     district: 'songpa',       address: '서울 송파구' },
  { subdomain: 'cheonho',       name: '밴스의원 천호점',     district: 'gangdong',     address: '서울 강동구' },
  { subdomain: 'seongsu',       name: '밴스의원 성수점',     district: 'seongdong',    address: '서울 성동구' },
  { subdomain: 'wangsimni',     name: '밴스의원 왕십리점',   district: 'seongdong',    address: '서울 성동구' },
  { subdomain: 'dongdaemun',    name: '밴스의원 동대문점',   district: 'dongdaemun',   address: '서울 동대문구' },
  { subdomain: 'hongdae',       name: '밴스의원 홍대점',     district: 'mapo',         address: '서울 마포구' },
  { subdomain: 'sinchon',       name: '밴스의원 신촌점',     district: 'seodaemun',    address: '서울 서대문구' },
  { subdomain: 'mapo',          name: '밴스의원 마포공덕점', district: 'mapo',         address: '서울 마포구' },
  { subdomain: 'yongsan',       name: '밴스의원 용산점',     district: 'yongsan',      address: '서울 용산구' },
  { subdomain: 'myeongdong',    name: '밴스의원 명동점',     district: 'jung',         address: '서울 중구' },
  { subdomain: 'myeongdong2',   name: '밴스의원 명동2호점',  district: 'jung',         address: '서울 중구' },
  { subdomain: 'yeouido',       name: '밴스의원 여의도점',   district: 'yeongdeungpo', address: '서울 영등포구' },
  { subdomain: 'yeongdeungpo',  name: '밴스의원 영등포점',   district: 'yeongdeungpo', address: '서울 영등포구' },
  { subdomain: 'guro',          name: '밴스의원 구로점',     district: 'guro',         address: '서울 구로구' },
  { subdomain: 'hwagok',        name: '밴스의원 강서화곡점', district: 'gangseo',      address: '서울 강서구' },
];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
const CATEGORY_TAG_MAP = {
  '1회 체험가': 'first',
  '체험가': 'first',
  '보톡스': 'botox',
  '윤곽주사': 'botox',
  '보톡스/윤곽주사': 'botox',
  '필러': 'filler',
  '실리프팅': 'filler',
  '필러/실리프팅': 'filler',
  '레이저리프팅': 'lifting',
  '리프팅': 'lifting',
  '티타늄리프팅': 'lifting',
  '스킨부스터': 'skinbooster',
  '줄기세포': 'skinbooster',
  '제모': 'hair_removal',
  '스킨케어': 'skincare',
  '여드름': 'skincare',
  '여드름치료/점제거': 'skincare',
  '미백/기미/홍조/색소': 'laser',
  '색소': 'laser',
  '수액': null,
  '반영구화장': null,
  '비급여항목': null,
  '코스메틱': null,
  '다이어트': 'body',
  '제로팻주사': 'body',
  '제로팻주사(얼굴/바디)': 'body',
  '퀵제로팻': 'body',
  '바디': 'body',
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

// ── 카테고리 목록 파싱 ───────────────────────────────────────────
function parseCategories(html) {
  const $ = cheerio.load(html);
  const categories = [];
  $('.surgeryTabList ul li a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    const match = href.match(/categoryId=(\d+)/);
    const categoryId = match ? match[1] : null;
    if (name && categoryId) {
      categories.push({ id: categoryId, name });
    }
  });
  // first category might not have categoryId in URL (active tab)
  if (categories.length === 0) {
    // try getting it from the active one differently
    const activeTab = $('.surgeryTabList a.on');
    if (activeTab.length) {
      const href = activeTab.attr('href') || '';
      const name = activeTab.text().trim();
      const match = href.match(/categoryId=(\d+)/);
      if (name) {
        categories.push({ id: match ? match[1] : 'default', name });
      }
    }
  }
  return categories;
}

// ── 시술 항목 파싱 ───────────────────────────────────────────────
function parseTreatments(html) {
  const $ = cheerio.load(html);
  const items = [];

  $('.listBox').each((_, box) => {
    const $box = $(box);

    // VAT info
    const vatText = $box.find('.vat').first().text().trim();
    const vatIncluded = vatText.includes('포함');

    $box.find('.listText').each((_, item) => {
      const $item = $(item);

      // product name: text content of .listTitle excluding child elements
      const $title = $item.find('.listTitle');
      const nameText = $title.clone().children().remove().end().text().trim();
      if (!nameText) return;

      // prices
      const eventPriceText = $item.find('.priceAfter').text().trim();
      const origPriceText = $item.find('.priceLine').text().trim();

      const eventPrice = parsePrice(eventPriceText);
      const origPrice = parsePrice(origPriceText);

      // If there's a discount, orig is the original and event is the sale price
      // If no discount, the shown price is the regular price
      if (origPrice && eventPrice) {
        items.push({ name: nameText, orig: origPrice, event: eventPrice });
      } else if (eventPrice) {
        items.push({ name: nameText, orig: null, event: eventPrice });
      }
    });
  });

  return items;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  const baseUrl = `https://${branch.subdomain}.vandsclinic.co.kr`;
  console.log(`\n🔍 ${branch.name} (${baseUrl})`);

  // 1) Fetch main product page to get category list
  const mainHtml = await fetchPage(`${baseUrl}/web/product`);
  const categories = parseCategories(mainHtml);

  if (categories.length === 0) {
    console.log(`  ⚠ 카테고리를 찾을 수 없습니다`);
    return null;
  }
  console.log(`  📋 카테고리 ${categories.length}개: ${categories.map(c => c.name).join(', ')}`);

  // 2) Parse treatments for each category
  const result = [];
  for (const cat of categories) {
    // first category is already loaded in mainHtml
    let html;
    if (cat === categories[0]) {
      html = mainHtml;
    } else {
      await new Promise(r => setTimeout(r, 500)); // polite delay
      html = await fetchPage(`${baseUrl}/web/product?categoryId=${cat.id}`);
    }

    const items = parseTreatments(html);
    const tag = guessTag(cat.name);

    if (items.length > 0) {
      result.push({
        name: cat.name,
        tag,
        items,
      });
      console.log(`  ✓ ${cat.name} (${tag || 'none'}): ${items.length}개`);
    } else {
      console.log(`  - ${cat.name}: 항목 없음`);
    }
  }

  return {
    clinic: {
      id: `vands_${branch.subdomain}`,
      district_id: branch.district,
      name: branch.name,
      address: branch.address,
      phone: '',
      note: 'VAT 별도',
      color: 'from-blue-500 to-cyan-500',
    },
    categories: result,
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
    branches = branches.filter(b => b.subdomain === branchFilter);
    if (branches.length === 0) {
      console.error(`❌ 지점 '${branchFilter}'을 찾을 수 없습니다`);
      console.log('사용 가능한 지점:', SEOUL_BRANCHES.map(b => b.subdomain).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 밴스의원 크롤링 시작 (${branches.length}개 지점) ===`);

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
    const outputPath = './crawl-results-vands.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
