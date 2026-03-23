/**
 * 블리비의원 (Blivi/VelyB) 크롤러
 * 공식 홈페이지에서 서울 전 지점 가격 데이터 수집
 *
 * Usage:
 *   node scripts/crawl-blivi.mjs                     # 크롤링만 (JSON 출력)
 *   node scripts/crawl-blivi.mjs --seed              # 크롤링 + Supabase 시드
 *   node scripts/crawl-blivi.mjs --branch gangnam    # 특정 지점만
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// ── 블리비의원 서울 지점 목록 ──────────────────────────────────────
const SEOUL_BRANCHES = [
  { id: 'gangnam',       name: '블리비의원 강남역점',     branchParam: '강남역점',     district: 'seocho',       address: '서울 서초구' },
  { id: 'konkuk',        name: '블리비의원 건대점',       branchParam: '건대점',       district: 'gwangjin',     address: '서울 광진구' },
  { id: 'nowon',         name: '블리비의원 노원점',       branchParam: '노원점',       district: 'nowon',        address: '서울 노원구' },
  { id: 'myeongdong',    name: '블리비의원 명동점',       branchParam: '명동점',       district: 'jung',         address: '서울 중구' },
  { id: 'mokdong',       name: '블리비의원 목동점',       branchParam: '목동점',       district: 'yangcheon',    address: '서울 양천구' },
  { id: 'balsan',        name: '블리비의원 발산점',       branchParam: '발산점',       district: 'gangseo',      address: '서울 강서구' },
  { id: 'yeongdeungpo', name: '블리비의원 영등포점',     branchParam: '영등포점',     district: 'yeongdeungpo', address: '서울 영등포구' },
  { id: 'yongsan',       name: '블리비의원 용산점',       branchParam: '용산점',       district: 'yongsan',      address: '서울 용산구' },
  { id: 'jamsil',        name: '블리비의원 잠실점',       branchParam: '잠실점',       district: 'songpa',       address: '서울 송파구' },
  { id: 'cheongnyangni', name: '블리비의원 청량리점',     branchParam: '청량리점',     district: 'dongdaemun',   address: '서울 동대문구' },
  { id: 'hongdae',       name: '블리비의원 홍대점',       branchParam: '홍대점',       district: 'mapo',         address: '서울 마포구' },
  { id: 'cheongdam',     name: '블리비의원 리저브청담점', branchParam: '리저브청담점', district: 'gangnam',      address: '서울 강남구' },
];

// ── 카테고리 목록 (sField 값) ────────────────────────────────────
const CATEGORIES = [
  { sField: '1', name: '기획전',     tag: null },
  { sField: '2', name: '쁘띠성형',   tag: 'filler' },
  { sField: '3', name: '피부',       tag: 'skincare' },
  { sField: '4', name: '리프팅',     tag: 'lifting' },
  { sField: '5', name: '부스터',     tag: 'skinbooster' },
  { sField: '6', name: '제모',       tag: 'hair_removal' },
  { sField: '7', name: '비만',       tag: 'body' },
];

// ── 이벤트 제목에서 세부 태그 추측 ────────────────────────────────
const TAG_KEYWORDS = {
  '보톡스': 'botox',
  '윤곽': 'botox',
  '필러': 'filler',
  '실리프팅': 'filler',
  '울쎄라': 'lifting',
  '써마지': 'lifting',
  '슈링크': 'lifting',
  '인모드': 'lifting',
  '리프팅': 'lifting',
  '스킨부스터': 'skinbooster',
  '부스터': 'skinbooster',
  '줄기세포': 'skinbooster',
  '제모': 'hair_removal',
  '여드름': 'skincare',
  '모공': 'skincare',
  '피부': 'skincare',
  '색소': 'laser',
  '기미': 'laser',
  '토닝': 'laser',
  '레이저': 'laser',
  '미백': 'laser',
  '다이어트': 'body',
  '비만': 'body',
  '지방': 'body',
};

function guessTag(text) {
  if (!text) return null;
  for (const [key, tag] of Object.entries(TAG_KEYWORDS)) {
    if (text.includes(key)) return tag;
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
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ── 이벤트 목록 페이지에서 시술 항목 파싱 ──────────────────────────
// Structure: .boardList > ul > li (event cards)
//   each card has .t01 (title), .slist li (treatment items)
//   each .slist li has <strong> (name), .o_price01 (event price), .s_price01 (orig price)
function parseTreatments(html) {
  const $ = cheerio.load(html);
  const items = [];

  $('.boardList > ul > li').each((_, card) => {
    const $card = $(card);
    const groupTitle = $card.find('.t01').text().trim().replace(/^\[.*?\]\s*/, '');

    $card.find('.slist li').each((_, li) => {
      const $li = $(li);
      const name = $li.find('strong').text().trim();
      if (!name) return;

      // .o_price01 = discounted/event price, .s_price01 = original price (with <del>)
      const eventPriceText = $li.find('.o_price01').text().trim();
      const origPriceText = $li.find('.s_price01').text().trim();

      const eventPrice = parsePrice(eventPriceText);
      const origPrice = parsePrice(origPriceText);

      if (eventPrice) {
        items.push({
          name,
          orig: origPrice && origPrice !== eventPrice ? origPrice : null,
          event: eventPrice,
          groupTitle,
        });
      }
    });
  });

  return items;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  // Site redirects to m.velyb.kr for mobile UA
  const baseUrl = 'https://m.velyb.kr';
  console.log(`\n🔍 ${branch.name}`);

  const allCategories = [];
  const seenNames = new Set();

  for (const cat of CATEGORIES) {
    const encodedBranch = encodeURIComponent(branch.branchParam);

    // Fetch all pages for this category
    let page = 1;
    let totalItems = [];

    while (page <= 5) { // safety limit
      const url = `${baseUrl}/community/community01.php?tb=event2&etc5=${encodedBranch}&sField=${cat.sField}${page > 1 ? `&p=${page}` : ''}`;

      try {
        await new Promise(r => setTimeout(r, 500)); // polite delay
        const html = await fetchPage(url);
        const items = parseTreatments(html);

        if (items.length === 0) break;

        // Deduplicate
        for (const item of items) {
          const key = `${item.name}_${item.event}`;
          if (!seenNames.has(key)) {
            seenNames.add(key);
            totalItems.push(item);
          }
        }

        // Check if there's a next page
        const $ = cheerio.load(html);
        const hasNextPage = $(`a[href*="p=${page + 1}"]`).length > 0;
        if (!hasNextPage) break;

        page++;
      } catch (e) {
        console.log(`  - ${cat.name} p${page}: 접근 불가 (${e.message})`);
        break;
      }
    }

    if (totalItems.length > 0) {
      // Refine tag: use category default, but override with guessTag from group titles
      let tag = cat.tag;
      if (!tag) {
        for (const item of totalItems.slice(0, 5)) {
          const guessed = guessTag(item.groupTitle) || guessTag(item.name);
          if (guessed) { tag = guessed; break; }
        }
      }

      allCategories.push({
        name: cat.name,
        tag,
        items: totalItems.map(({ name, orig, event }) => ({ name, orig, event })),
      });
      console.log(`  ✓ ${cat.name} (${tag || 'none'}): ${totalItems.length}개`);
    } else {
      console.log(`  - ${cat.name}: 항목 없음`);
    }
  }

  if (allCategories.length === 0) {
    console.log(`  ⚠ 시술 항목을 찾을 수 없습니다`);
    return null;
  }

  const totalItems = allCategories.reduce((sum, c) => sum + c.items.length, 0);
  console.log(`  📋 카테고리 ${allCategories.length}개, 총 ${totalItems}개 시술`);

  return {
    clinic: {
      id: `blivi_${branch.id}`,
      district_id: branch.district,
      name: branch.name,
      address: branch.address,
      phone: '',
      note: 'VAT 포함',
      color: 'from-rose-500 to-pink-400',
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
    branches = branches.filter(b => b.id === branchFilter);
    if (branches.length === 0) {
      console.error(`❌ 지점 '${branchFilter}'을 찾을 수 없습니다`);
      console.log('사용 가능한 지점:', SEOUL_BRANCHES.map(b => b.id).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 블리비의원 크롤링 시작 (${branches.length}개 지점) ===`);

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
    const outputPath = './crawl-results-blivi.json';
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ${outputPath}`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
