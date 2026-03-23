/**
 * 유앤아이의원 (U&I Clinic) 크롤러
 * 공식 홈페이지에서 서울 전 지점 가격 데이터 수집
 *
 * Usage:
 *   node scripts/crawl-uni.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-uni.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-uni.mjs --branch gangnam  # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── 유앤아이의원 서울 지점 목록 ─────────────────────────────────
const SEOUL_BRANCHES = [
  { prefix: '',      name: '유앤아이의원 강남점',     branch: 'gangnam',       district: 'gangnam',       address: '서울 강남구' },
  { prefix: 'sl',    name: '유앤아이의원 선릉점',     branch: 'seolleung',     district: 'gangnam',       address: '서울 강남구' },
  { prefix: 'js',    name: '유앤아이의원 잠실점',     branch: 'jamsil',        district: 'songpa',        address: '서울 송파구' },
  { prefix: 'wsn',   name: '유앤아이의원 왕십리점',   branch: 'wangsimni',     district: 'seongdong',     address: '서울 성동구' },
  { prefix: 'md',    name: '유앤아이의원 명동점',     branch: 'myeongdong',    district: 'jung',          address: '서울 중구' },
  { prefix: 'hd',    name: '유앤아이의원 홍대신촌점', branch: 'hongdae',       district: 'mapo',          address: '서울 마포구' },
  { prefix: 'ydp',   name: '유앤아이의원 영등포점',   branch: 'yeongdeungpo',  district: 'yeongdeungpo',  address: '서울 영등포구' },
  { prefix: 'mg',    name: '유앤아이의원 마곡점',     branch: 'magok',         district: 'gangseo',       address: '서울 강서구' },
  { prefix: 'gd',    name: '유앤아이의원 건대점',     branch: 'geondae',       district: 'gwangjin',      address: '서울 광진구' },
  { prefix: 'gr',    name: '유앤아이의원 구로점',     branch: 'guro',          district: 'guro',          address: '서울 구로구' },
  { prefix: 'yd',    name: '유앤아이의원 여의도점',   branch: 'yeouido',       district: 'yeongdeungpo',  address: '서울 영등포구' },
  { prefix: 'ch',    name: '유앤아이의원 천호점',     branch: 'cheonho',       district: 'gangdong',      address: '서울 강동구' },
  { prefix: 'mdg',   name: '유앤아이의원 목동점',     branch: 'mokdong',       district: 'yangcheon',     address: '서울 양천구' },
  { prefix: 'cd',    name: '유앤아이의원 창동점',     branch: 'changdong',     district: 'dobong',        address: '서울 도봉구' },
];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
const CATEGORY_TAG_MAP = {
  '보톡스': 'botox',
  '윤곽주사': 'botox',
  '필러': 'filler',
  '실리프팅': 'filler',
  '리프팅': 'lifting',
  '레이저리프팅': 'lifting',
  '울쎄라': 'lifting',
  '써마지': 'lifting',
  '인모드': 'lifting',
  '스킨부스터': 'skinbooster',
  '줄기세포': 'skinbooster',
  '제모': 'hair_removal',
  '스킨케어': 'skincare',
  '여드름': 'skincare',
  '피부관리': 'skincare',
  '색소': 'laser',
  '기미': 'laser',
  '레이저': 'laser',
  '토닝': 'laser',
  '다이어트': 'body',
  '체형': 'body',
  '바디': 'body',
  '수액': null,
  '이벤트': null,
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

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'application/json, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ── Build base URL for a branch ─────────────────────────────────
function getBranchBaseUrl(branch) {
  const prefix = branch.prefix;
  return `https://${prefix}uni114.co.kr`;
}

// ── Parse API response (JSON from /limited/list) ────────────────
function parseAPIResponse(json) {
  const items = [];
  const eventList = json?.eventList || json?.data?.eventList || [];
  if (!Array.isArray(eventList)) return items;

  for (const evt of eventList) {
    const name = evt.limitedTitle || evt.prodSubject || '';
    if (!name) continue;

    const origPrice = parsePrice(String(evt.prodPrice || ''));
    const eventPrice = parsePrice(String(evt.discountPrice || ''));

    if (eventPrice || origPrice) {
      items.push({
        name: name.trim(),
        orig: origPrice,
        event: eventPrice || origPrice,
      });
    }
  }
  return items;
}

// ── Parse event page HTML ───────────────────────────────────────
function parseEventPage(html) {
  const $ = cheerio.load(html);
  const categories = [];
  const categoryMap = new Map();

  // Try parsing category tabs with data-category
  $('[data-category]').each((_, el) => {
    const catId = $(el).attr('data-category');
    const catName = $(el).text().trim();
    if (catId && catName && !categoryMap.has(catId)) {
      categoryMap.set(catId, catName);
    }
  });

  // Try parsing event listing items
  const items = [];
  // Look for price patterns in various selectors
  const priceSelectors = [
    '.event_list li',
    '.evt_list li',
    '.event_item',
    '.price_list li',
    '.sub_event_list li',
    '.event-item',
    '.limited_list li',
  ];

  for (const selector of priceSelectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      const text = $el.text();

      // Extract name - look for title/heading elements
      let name = '';
      const titleEl = $el.find('.tit, .title, .name, h3, h4, strong').first();
      if (titleEl.length) {
        name = titleEl.text().trim();
      }

      // Extract prices from text - look for number patterns like "99,000" or "99000"
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

  // Fallback: scan all text for price patterns
  if (items.length === 0) {
    $('*').each((_, el) => {
      const $el = $(el);
      if ($el.children().length > 0) return; // only leaf nodes
      const text = $el.text().trim();
      // Look for patterns like "시술명 XX,XXX원" or price after arrow
      const match = text.match(/(.+?)\s*[\-→>]\s*([\d,]+)\s*원/);
      if (match) {
        items.push({ name: match[1].trim(), orig: null, event: parsePrice(match[2]) });
      }
    });
  }

  // Also try to find event images for reference
  const eventImages = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('event') || src.includes('limited') || src.includes('popup')) {
      eventImages.push(src);
    }
  });

  return { items, eventImages, categoryMap };
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  const baseUrl = getBranchBaseUrl(branch);
  console.log(`\n🔍 ${branch.name} (${baseUrl})`);

  const allItems = [];
  let eventImages = [];

  // Strategy 1: Try the API endpoint /limited/list
  const apiUrls = [
    `${baseUrl}/limited/list`,
    `https://${branch.prefix ? branch.prefix + '.' : ''}uni114.co.kr/limited/list`,
  ];

  let apiSuccess = false;
  for (const apiUrl of apiUrls) {
    try {
      console.log(`  📡 API 시도: ${apiUrl}`);
      const json = await fetchJSON(apiUrl);
      const items = parseAPIResponse(json);
      if (items.length > 0) {
        allItems.push(...items);
        apiSuccess = true;
        console.log(`  ✓ API에서 ${items.length}개 항목 수집`);
        break;
      } else {
        console.log(`  - API 응답은 있으나 항목 없음`);
      }
    } catch (e) {
      console.log(`  - API 실패: ${e.message}`);
    }
  }

  // Strategy 2: Parse the /event/ page HTML
  if (!apiSuccess) {
    const eventUrls = [
      `${baseUrl}/event/`,
      `${baseUrl}/event`,
      `https://${branch.prefix ? branch.prefix + '.' : ''}uni114.co.kr/event/`,
    ];

    for (const eventUrl of eventUrls) {
      try {
        console.log(`  📄 이벤트 페이지 시도: ${eventUrl}`);
        const html = await fetchPage(eventUrl);
        const parsed = parseEventPage(html);

        if (parsed.items.length > 0) {
          allItems.push(...parsed.items);
          console.log(`  ✓ HTML에서 ${parsed.items.length}개 항목 수집`);
          break;
        }

        if (parsed.eventImages.length > 0) {
          eventImages = parsed.eventImages;
          console.log(`  📸 이벤트 이미지 ${parsed.eventImages.length}개 발견 (가격 텍스트 없음)`);
        } else {
          console.log(`  - 이벤트 페이지에 가격 정보 없음`);
        }
      } catch (e) {
        console.log(`  - 이벤트 페이지 실패: ${e.message}`);
      }
    }
  }

  // Strategy 3: Try main page for any popup/event info
  if (allItems.length === 0) {
    try {
      console.log(`  📄 메인 페이지 시도: ${baseUrl}`);
      const html = await fetchPage(baseUrl);
      const parsed = parseEventPage(html);
      if (parsed.items.length > 0) {
        allItems.push(...parsed.items);
        console.log(`  ✓ 메인에서 ${parsed.items.length}개 항목 수집`);
      }
      if (parsed.eventImages.length > 0 && eventImages.length === 0) {
        eventImages = parsed.eventImages;
        console.log(`  📸 메인 이벤트 이미지 ${parsed.eventImages.length}개 발견`);
      }
    } catch (e) {
      console.log(`  - 메인 페이지 실패: ${e.message}`);
    }
  }

  if (allItems.length === 0) {
    if (eventImages.length > 0) {
      console.log(`  ⚠ 가격 텍스트 없음, 이미지만 발견: ${eventImages.slice(0, 3).join(', ')}`);
    } else {
      console.log(`  ⚠ 수집된 항목 없음`);
    }
    return null;
  }

  // Group items into a single "이벤트" category (API doesn't provide categories)
  // Try to guess tags from item names
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
      id: `uni_${branch.branch}`,
      district_id: branch.district,
      name: branch.name,
      address: branch.address,
      phone: '',
      note: 'VAT 별도',
      color: 'from-emerald-500 to-green-400',
    },
    categories,
    eventImages: eventImages.length > 0 ? eventImages : undefined,
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
    branches = branches.filter(b => b.branch === branchFilter);
    if (branches.length === 0) {
      console.error(`❌ 지점 '${branchFilter}'을 찾을 수 없습니다`);
      console.log('사용 가능한 지점:', SEOUL_BRANCHES.map(b => b.branch).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 유앤아이의원 크롤링 시작 (${branches.length}개 지점) ===`);

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
    await new Promise(r => setTimeout(r, 500)); // polite delay
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
    const outputPath = './crawl-results-uni.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
