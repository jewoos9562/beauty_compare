/**
 * 데이뷰의원 (Daybeau Clinic) 크롤러
 * 공식 홈페이지에서 서울 전 지점 가격 데이터 수집
 *
 * Usage:
 *   node scripts/crawl-daybeau.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-daybeau.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-daybeau.mjs --branch 01  # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── 데이뷰의원 서울 지점 목록 ──────────────────────────────────────
const SEOUL_BRANCHES = [
  { number: '01', name: '데이뷰의원 강서발산점',       district: 'gangseo',       address: '서울 강서구' },
  { number: '02', name: '데이뷰의원 마포홍대점',       district: 'mapo',          address: '서울 마포구' },
  { number: '04', name: '데이뷰의원 건대입구역점',     district: 'gwangjin',      address: '서울 광진구' },
  { number: '07', name: '데이뷰의원 강남더프리미엄점', district: 'gangnam',       address: '서울 강남구' },
  { number: '08', name: '데이뷰의원 여의도점',         district: 'yeongdeungpo', address: '서울 영등포구' },
  { number: '09', name: '데이뷰의원 영등포점',         district: 'yeongdeungpo', address: '서울 영등포구' },
  { number: '11', name: '데이뷰의원 명동더프리미엄점', district: 'jung',          address: '서울 중구' },
  { number: '16', name: '데이뷰의원 명동더프리미엄2호점', district: 'jung',       address: '서울 중구' },
];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
const CATEGORY_TAG_MAP = {
  '첫방문': 'first',
  '1회체험가': 'first',
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
  '레이저': 'laser',
  '기미/색소/제모/문신제거 레이저': 'laser',
  '에스테틱': 'skincare',
  '수액': null,
  '반영구화장': null,
  '비급여항목': null,
  '코스메틱': null,
  '다이어트': 'body',
  '제로팻주사': 'body',
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

// ── 개별 시술 항목 파싱 헬퍼 ─────────────────────────────────────
function parseActionItem($, action) {
  const $action = $(action);

  // Treatment name: second div inside label (first div is icon_wrap with badge)
  // The name div contains the treatment text + span.goodsSummary (subtitle to exclude)
  const $nameDivs = $action.find('div.surgery_info_title label > div');
  const $nameDiv = $nameDivs.length > 1 ? $nameDivs.eq(1) : $nameDivs.first();
  let name = '';
  if ($nameDiv.length) {
    // Clone and remove spans to get only the text node
    name = $nameDiv.clone().find('span.goodsSummary, span.mbr').remove().end().text().trim();
  }
  if (!name) return null;

  // Original price: div.price span
  const origPriceText = $action.find('div.price span').first().text().trim();
  const origPrice = parsePrice(origPriceText);

  // Discounted price: div.custPrice span
  const eventPriceText = $action.find('div.custPrice span').first().text().trim();
  const eventPrice = parsePrice(eventPriceText);

  // Badge/tag
  const badge = $action.find('span.icon_btn').text().trim();

  if (!eventPrice && !origPrice) return null;

  const item = { name };
  if (origPrice && eventPrice && origPrice !== eventPrice) {
    item.orig = origPrice;
    item.event = eventPrice;
  } else if (eventPrice) {
    item.orig = null;
    item.event = eventPrice;
  } else {
    item.orig = null;
    item.event = origPrice;
  }
  if (badge) item.badge = badge;
  return item;
}

// ── 이벤트 페이지 파싱 ──────────────────────────────────────────
function parseEventPage(html) {
  const $ = cheerio.load(html);
  const categories = [];

  // Each <li> in ul.event_list is a category section
  $('ul.event_list > li').each((_, li) => {
    const $li = $(li);

    // Category name from event_cont_title
    const categoryName = $li.find('div.event_cont_title div.item').first().text().trim();

    // Treatment items within div.action containers inside this li
    const items = [];
    $li.find('div.action').each((_, action) => {
      const item = parseActionItem($, action);
      if (item) items.push(item);
    });

    if (categoryName && items.length > 0) {
      categories.push({
        name: categoryName,
        tag: guessTag(categoryName),
        items,
      });
    }
  });

  // Fallback: if no li-based categories found, try flat div.action parsing
  if (categories.length === 0) {
    const items = [];
    $('div.action').each((_, action) => {
      const item = parseActionItem($, action);
      if (item) items.push(item);
    });

    if (items.length > 0) {
      categories.push({
        name: '이벤트',
        tag: null,
        items,
      });
    }
  }

  return categories;
}

// ── 이벤트 링크 파싱 (추가 uid 페이지 탐색) ──────────────────────
function parseEventLinks(html) {
  const $ = cheerio.load(html);
  const links = [];
  // Look for links to other event UIDs
  $('a[href*="event.php?uid="]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(/uid=(\d+)/);
    if (match) {
      const uid = match[1];
      const text = $(el).text().trim();
      if (!links.some(l => l.uid === uid)) {
        links.push({ uid, text });
      }
    }
  });
  return links;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  const baseUrl = `https://daybeauclinic${branch.number}.com`;
  console.log(`\n🔍 ${branch.name} (${baseUrl})`);

  // 1) Fetch default event page
  const eventUrl = `${baseUrl}/branch/event.php`;
  let mainHtml;
  try {
    mainHtml = await fetchPage(eventUrl);
  } catch (e) {
    console.log(`  ⚠ 이벤트 페이지 접속 실패: ${e.message}`);
    return null;
  }

  // 2) Parse categories and treatments from the default page
  let allCategories = parseEventPage(mainHtml);

  // 3) Check for additional event UIDs linked from the page
  const eventLinks = parseEventLinks(mainHtml);
  if (eventLinks.length > 0) {
    console.log(`  📋 추가 이벤트 링크 ${eventLinks.length}개 발견: ${eventLinks.map(l => `uid=${l.uid} (${l.text})`).join(', ')}`);

    for (const link of eventLinks) {
      await new Promise(r => setTimeout(r, 500)); // polite delay
      try {
        const html = await fetchPage(`${eventUrl}?uid=${link.uid}`);
        const cats = parseEventPage(html);
        for (const cat of cats) {
          // Merge or add categories
          const existing = allCategories.find(c => c.name === cat.name);
          if (existing) {
            // Add items that don't already exist (by name)
            for (const item of cat.items) {
              if (!existing.items.some(i => i.name === item.name)) {
                existing.items.push(item);
              }
            }
          } else {
            allCategories.push(cat);
          }
        }
      } catch (e) {
        console.log(`  ⚠ uid=${link.uid} 페이지 실패: ${e.message}`);
      }
    }
  }

  if (allCategories.length === 0) {
    console.log(`  ⚠ 시술 항목을 찾을 수 없습니다`);
    return null;
  }

  console.log(`  📋 카테고리 ${allCategories.length}개: ${allCategories.map(c => c.name).join(', ')}`);
  for (const cat of allCategories) {
    console.log(`  ✓ ${cat.name} (${cat.tag || 'none'}): ${cat.items.length}개`);
  }

  return {
    clinic: {
      id: `daybeau_${branch.number}`,
      district_id: branch.district,
      name: branch.name,
      address: branch.address,
      phone: '',
      note: 'VAT 포함',
      color: 'from-orange-500 to-amber-400',
    },
    categories: allCategories,
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
    branches = branches.filter(b => b.number === branchFilter);
    if (branches.length === 0) {
      console.error(`❌ 지점 '${branchFilter}'을 찾을 수 없습니다`);
      console.log('사용 가능한 지점:', SEOUL_BRANCHES.map(b => `${b.number} (${b.name})`).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 데이뷰의원 크롤링 시작 (${branches.length}개 지점) ===`);

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
    await new Promise(r => setTimeout(r, 500));
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
    const outputPath = './crawl-results-daybeau.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
