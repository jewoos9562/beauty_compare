/**
 * 톡스앤필 (ToxNFill) 크롤러
 * 공식 홈페이지에서 서울 전 지점 가격 데이터 수집
 *
 * TWO-LEVEL scraping:
 *   1. /m/serviceInfo.php?c={cat_id} — treatment list with "starting from" prices
 *   2. /m/detail.php?c={cat_id}&i={item_id} — actual individual sub-item prices
 *
 * Usage:
 *   node scripts/crawl-toxnfill.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-toxnfill.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-toxnfill.mjs --branch gangnam  # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── 톡스앤필 서울 지점 목록 ──────────────────────────────────────
// Branch URLs: toxnfill{N}.com where N is the branch number
const SEOUL_BRANCHES = [
  { num: 1,  subdomain: 'gangnam',    name: '톡스앤필 강남본점',         district: 'gangnam',   address: '서울 강남구' },
  { num: 2,  subdomain: 'apgujeong',  name: '톡스앤필 압구정점',         district: 'gangnam',   address: '서울 강남구' },
  { num: 6,  subdomain: 'konkuk',     name: '톡스앤필 건대점',           district: 'gwangjin',  address: '서울 광진구' },
  { num: 9,  subdomain: 'sinnonhyeon',name: '톡스앤필 신논현점',         district: 'gangnam',   address: '서울 강남구' },
  { num: 10, subdomain: 'gwanak',     name: '톡스앤필 관악서울대입구점', district: 'gwanak',    address: '서울 관악구' },
  { num: 15, subdomain: 'nowon',      name: '톡스앤필 노원점',           district: 'nowon',     address: '서울 노원구' },
  { num: 17, subdomain: 'cheonho',    name: '톡스앤필 강동천호점',       district: 'gangdong',  address: '서울 강동구' },
  { num: 29, subdomain: 'songpa',     name: '톡스앤필 송파점',           district: 'songpa',    address: '서울 송파구' },
  { num: 32, subdomain: 'gangseo',    name: '톡스앤필 강서점',           district: 'gangseo',   address: '서울 강서구' },
  { num: 35, subdomain: 'myeongdong', name: '톡스앤필 명동점',           district: 'jung',      address: '서울 중구' },
  { num: 39, subdomain: 'mia',        name: '톡스앤필 미아사거리점',     district: 'gangbuk',   address: '서울 강북구' },
  { num: 41, subdomain: 'mokdong',    name: '톡스앤필 목동점',           district: 'yangcheon', address: '서울 양천구' },
  { num: 50, subdomain: 'hongdae',    name: '톡스앤필 홍대점',           district: 'mapo',      address: '서울 마포구' },
];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
const TAG_CONFIG = {
  '보톡스': 'botox',
  '톡신': 'botox',
  '윤곽': 'botox',
  '필러': 'filler',
  '리프팅': 'lifting',
  '실리프팅': 'lifting',
  '울쎄라': 'lifting',
  '올리지오': 'lifting',
  '스킨부스터': 'skinbooster',
  '주사': 'skinbooster',
  '물광': 'skinbooster',
  '레이저': 'laser',
  '색소': 'laser',
  '토닝': 'laser',
  '피코': 'laser',
  '제모': 'hair_removal',
  '스킨케어': 'skincare',
  '피부관리': 'skincare',
  '여드름': 'skincare',
  '모공': 'skincare',
  '바디': 'body',
  '다이어트': 'body',
  '체형': 'body',
  '지방': 'body',
  '이벤트': 'event',
  '첫방문': 'first',
  '체험': 'first',
  '1회': 'first',
};

function guessTag(categoryName) {
  for (const [keyword, tag] of Object.entries(TAG_CONFIG)) {
    if (categoryName.includes(keyword)) return tag;
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
  $('ul.serviceMenu li a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    const match = href.match(/[?&]c=(\d+)/);
    const categoryId = match ? match[1] : null;
    if (name && categoryId) {
      categories.push({ id: categoryId, name });
    }
  });
  return categories;
}

// ── 시술 목록 파싱 (serviceInfo.php) ─────────────────────────────
function parseTreatmentList(html) {
  const $ = cheerio.load(html);
  const items = [];

  $('ul.product_list dl.sec_txt').each((_, el) => {
    const $el = $(el);
    const name = $el.find('dt.bold').text().trim();
    const priceText = $el.find('span.txt_num').text().trim();
    const price = parsePrice(priceText);

    // Extract link to detail page
    const $link = $el.closest('li').find('a[href*="detail.php"]');
    let detailHref = $link.attr('href') || '';
    // Also try the parent or sibling links
    if (!detailHref) {
      const $parentLink = $el.closest('a[href*="detail.php"]');
      detailHref = $parentLink.attr('href') || '';
    }
    if (!detailHref) {
      // Try finding an anchor wrapping the dl
      const $wrapper = $el.parent('a[href*="detail.php"]');
      detailHref = $wrapper.attr('href') || '';
    }

    // Parse c and i params from detail link
    const cMatch = detailHref.match(/[?&]c=(\d+)/);
    const iMatch = detailHref.match(/[?&]i=(\d+)/);
    const catId = cMatch ? cMatch[1] : null;
    const itemId = iMatch ? iMatch[1] : null;

    if (name) {
      items.push({ name, startingPrice: price, catId, itemId });
    }
  });

  return items;
}

// ── 상세 페이지 파싱 (detail.php) ────────────────────────────────
function parseDetailPage(html) {
  const $ = cheerio.load(html);
  const subItems = [];

  // Each li inside .treatment_list is one sub-item
  $('ul.treatment_list > li, .treatment_list li').each((_, row) => {
    const $row = $(row);
    const name = $row.find('.treatment_name_wrap p').first().text().trim();
    const priceText = $row.find('.treatment_price_wrap .price strong').first().text().trim();
    const price = parsePrice(priceText);

    // Also try extracting from onClick attribute as fallback
    if (name && price && price < 100000000) {
      subItems.push({ name, price });
    } else if (name) {
      // Try onClick: applyEvent('code', 'price', ...)
      const onclick = $row.find('input.idxChk').attr('onclick') || '';
      const match = onclick.match(/applyEvent\s*\(\s*'[^']*'\s*,\s*'(\d+)'/);
      if (match) {
        const p = parseInt(match[1], 10);
        if (p > 0 && p < 100000000) subItems.push({ name, price: p });
      }
    }
  });

  return subItems;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  const baseUrl = `https://toxnfill${branch.num}.com`;
  console.log(`\n🔍 ${branch.name} (${baseUrl})`);

  // 1) Fetch main service page to get category list
  const mainUrl = `${baseUrl}/m/serviceInfo.php`;
  let mainHtml;
  try {
    mainHtml = await fetchPage(mainUrl);
  } catch (e) {
    console.log(`  ⚠ 메인 페이지 접근 실패: ${e.message}`);
    return null;
  }

  const categories = parseCategories(mainHtml);

  if (categories.length === 0) {
    console.log(`  ⚠ 카테고리를 찾을 수 없습니다`);
    return null;
  }
  console.log(`  📋 카테고리 ${categories.length}개: ${categories.map(c => c.name).join(', ')}`);

  // 2) For each category, get treatment list, then detail pages
  const result = [];
  for (const cat of categories) {
    await new Promise(r => setTimeout(r, 500)); // polite delay

    let catHtml;
    try {
      catHtml = await fetchPage(`${baseUrl}/m/serviceInfo.php?c=${cat.id}`);
    } catch (e) {
      console.log(`  ⚠ 카테고리 ${cat.name} 페이지 실패: ${e.message}`);
      continue;
    }

    const treatmentList = parseTreatmentList(catHtml);
    const tag = guessTag(cat.name);
    const items = [];

    // For each treatment, try to fetch detail page for sub-items
    for (const treatment of treatmentList) {
      if (treatment.catId && treatment.itemId) {
        await new Promise(r => setTimeout(r, 500)); // polite delay

        try {
          const detailUrl = `${baseUrl}/m/detail.php?c=${treatment.catId}&i=${treatment.itemId}`;
          const detailHtml = await fetchPage(detailUrl);
          const subItems = parseDetailPage(detailHtml);

          if (subItems.length > 0) {
            // Use sub-items as individual treatments
            for (const sub of subItems) {
              items.push({
                name: `${treatment.name} - ${sub.name}`,
                orig: null,
                event: sub.price,
              });
            }
          } else {
            // No sub-items found; use the starting price
            if (treatment.startingPrice) {
              items.push({
                name: treatment.name,
                orig: null,
                event: treatment.startingPrice,
              });
            }
          }
        } catch (e) {
          // Detail page failed; fall back to starting price
          if (treatment.startingPrice) {
            items.push({
              name: treatment.name,
              orig: null,
              event: treatment.startingPrice,
            });
          }
        }
      } else {
        // No detail link; use starting price
        if (treatment.startingPrice) {
          items.push({
            name: treatment.name,
            orig: null,
            event: treatment.startingPrice,
          });
        }
      }
    }

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
      id: `toxnfill_${branch.subdomain}`,
      district_id: branch.district,
      name: branch.name,
      address: branch.address,
      phone: '',
      note: 'VAT 별도',
      color: 'from-violet-600 to-violet-400',
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

  console.log(`=== 톡스앤필 크롤링 시작 (${branches.length}개 지점) ===`);

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
    const outputPath = './crawl-results-toxnfill.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
