/**
 * 유앤아이의원 (U&I Clinic) VLM 크롤러
 * Claude Sonnet Vision으로 이벤트 이미지에서 가격 데이터 추출
 *
 * Usage:
 *   node scripts/crawl-uni-vlm.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-uni-vlm.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-uni-vlm.mjs --branch gangnam  # 특정 지점만
 */

import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'REDACTED',
});

// ── 유앤아이 서울 지점 목록 ──────────────────────────────────────
const SEOUL_BRANCHES = [
  { subdomain: '',      domain: 'uni114.co.kr',      name: '유앤아이의원 강남점',     district: 'gangnam',      branch: 'gangnam' },
  { subdomain: 'sl',    domain: 'sluni114.co.kr',    name: '유앤아이의원 선릉점',     district: 'gangnam',      branch: 'seolleung' },
  { subdomain: 'js',    domain: 'jsuni114.co.kr',    name: '유앤아이의원 잠실점',     district: 'songpa',       branch: 'jamsil' },
  { subdomain: 'wsn',   domain: 'wsnuni114.co.kr',   name: '유앤아이의원 왕십리점',   district: 'seongdong',    branch: 'wangsimni' },
  { subdomain: 'md',    domain: 'mduni114.co.kr',    name: '유앤아이의원 명동점',     district: 'jung',         branch: 'myeongdong' },
  { subdomain: 'hd',    domain: 'hduni114.co.kr',    name: '유앤아이의원 홍대신촌점', district: 'mapo',         branch: 'hongdae' },
  { subdomain: 'ydp',   domain: 'ydpuni114.co.kr',   name: '유앤아이의원 영등포점',   district: 'yeongdeungpo', branch: 'yeongdeungpo' },
  { subdomain: 'mg',    domain: 'mguni114.co.kr',    name: '유앤아이의원 마곡점',     district: 'gangseo',      branch: 'magok' },
  { subdomain: 'gd',    domain: 'gduni114.co.kr',    name: '유앤아이의원 건대점',     district: 'gwangjin',     branch: 'konkuk' },
  { subdomain: 'gr',    domain: 'gruni114.co.kr',    name: '유앤아이의원 구로점',     district: 'guro',         branch: 'guro' },
  { subdomain: 'yd',    domain: 'yduni114.co.kr',    name: '유앤아이의원 여의도점',   district: 'yeongdeungpo', branch: 'yeouido' },
  { subdomain: 'ch',    domain: 'chuni114.co.kr',    name: '유앤아이의원 천호점',     district: 'gangdong',     branch: 'cheonho' },
  { subdomain: 'mdg',   domain: 'mdguni114.co.kr',   name: '유앤아이의원 목동점',     district: 'yangcheon',    branch: 'mokdong' },
  { subdomain: 'cd',    domain: 'cduni114.co.kr',    name: '유앤아이의원 창동점',     district: 'dobong',       branch: 'changdong' },
];

// ── 카테고리 → 태그 매핑 ─────────────────────────────────────────
function guessTag(categoryName) {
  const lower = categoryName.toLowerCase();
  if (/보톡스|톡신|사각턱/.test(lower)) return 'botox';
  if (/필러|볼륨|실리프팅/.test(lower)) return 'filler';
  if (/리프팅|울쎄라|써마지|하이푸|인모드/.test(lower)) return 'lifting';
  if (/스킨부스터|부스터|물광|쥬베룩|리쥬란/.test(lower)) return 'skinbooster';
  if (/색소|기미|토닝|레이저|피코/.test(lower)) return 'laser';
  if (/제모/.test(lower)) return 'hair_removal';
  if (/스킨케어|관리|필링/.test(lower)) return 'skincare';
  if (/다이어트|바디|체형|지방/.test(lower)) return 'body';
  if (/이벤트|특가|할인/.test(lower)) return 'event';
  if (/첫방문|첫 방문|체험/.test(lower)) return 'first';
  if (/여드름|모공/.test(lower)) return 'skincare';
  if (/수액|주사|영양/.test(lower)) return null;
  return null;
}

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
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// ── 이미지 URL 추출 ─────────────────────────────────────────────
async function getEventImageUrls(domain) {
  const html = await fetchPage(`https://${domain}`);
  const urls = [...html.matchAll(/https:\/\/cdn\.uni114\.com\/limited\/[^"'\s]+\.(jpg|png|webp)/gi)].map(m => m[0]);
  return [...new Set(urls)];
}

// ── 이미지 → base64 ─────────────────────────────────────────────
async function fetchImageBase64(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

// ── Claude VLM으로 이미지에서 가격 추출 ──────────────────────────
async function extractPricesFromImages(imageUrls, branchName) {
  // 이미지를 5개씩 묶어서 처리 (토큰 절약)
  const batchSize = 5;
  const allItems = [];

  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    console.log(`    🤖 VLM 분석 중... (${i + 1}-${Math.min(i + batchSize, imageUrls.length)}/${imageUrls.length})`);

    const content = [];
    for (const url of batch) {
      try {
        const base64 = await fetchImageBase64(url);
        const ext = url.split('.').pop().toLowerCase();
        const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
      } catch (e) {
        console.log(`    ⚠ 이미지 다운로드 실패: ${url}`);
      }
    }

    if (content.length === 0) continue;

    content.push({
      type: 'text',
      text: `이 이미지들은 한국 피부과/성형외과 "${branchName}"의 이벤트 가격표입니다.
각 이미지에서 시술명과 가격을 추출해주세요.

반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
[
  {"category": "카테고리명", "name": "시술명", "orig": 원래가격숫자, "event": 할인가격숫자},
  ...
]

규칙:
- category: 보톡스, 필러, 리프팅, 스킨부스터, 제모, 스킨케어, 색소/레이저, 바디/다이어트, 이벤트 등으로 분류
- orig: 원래 가격 (취소선/할인 전 가격). 없으면 null
- event: 할인/이벤트 가격. 표시된 최종 가격
- 가격은 숫자만 (원, 쉼표 제거). 예: 350000
- 가격 정보가 없는 이미지는 빈 배열 []로 응답
- 같은 시술의 다른 단위(50U, 100U 등)는 각각 별도 항목으로`,
    });

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      });

      const text = response.content[0].text.trim();
      // JSON 추출 (```json ... ``` 또는 순수 JSON)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]);
        allItems.push(...items);
      }
    } catch (e) {
      console.log(`    ⚠ VLM 분석 실패: ${e.message}`);
    }

    // API rate limit 방지
    await new Promise(r => setTimeout(r, 1000));
  }

  return allItems;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  const baseUrl = `https://${branch.domain}`;
  console.log(`\n🔍 ${branch.name} (${baseUrl})`);

  // 1) 이벤트 이미지 URL 수집
  let imageUrls;
  try {
    imageUrls = await getEventImageUrls(branch.domain);
  } catch (e) {
    console.log(`  ⚠ 페이지 접근 실패: ${e.message}`);
    return null;
  }

  if (imageUrls.length === 0) {
    console.log(`  ⚠ 이벤트 이미지를 찾을 수 없습니다`);
    return null;
  }
  console.log(`  📸 이벤트 이미지 ${imageUrls.length}개 발견`);

  // 최대 30개 이미지만 처리 (비용 절약)
  const limitedUrls = imageUrls.slice(0, 30);

  // 2) VLM으로 가격 추출
  const items = await extractPricesFromImages(limitedUrls, branch.name);
  if (items.length === 0) {
    console.log(`  ⚠ 가격 정보를 추출하지 못했습니다`);
    return null;
  }

  // 3) 카테고리별로 그룹화
  const categoryMap = new Map();
  for (const item of items) {
    const catName = item.category || '기타';
    if (!categoryMap.has(catName)) categoryMap.set(catName, []);
    categoryMap.get(catName).push({
      name: item.name,
      orig: item.orig || null,
      event: item.event || null,
    });
  }

  const categories = [];
  for (const [name, catItems] of categoryMap) {
    categories.push({ name, tag: guessTag(name), items: catItems });
    console.log(`  ✓ ${name} (${guessTag(name) || 'none'}): ${catItems.length}개`);
  }

  return {
    clinic: {
      id: `uni_${branch.branch}`,
      district_id: branch.district,
      name: branch.name,
      address: `서울`,
      phone: '',
      note: 'VAT 별도',
      color: 'from-emerald-500 to-green-400',
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
    await supabase.from('districts').upsert({ id: clinic.district_id, name: clinic.district_id, active: true }, { onConflict: 'id' });
    const { error: clinicErr } = await supabase.from('clinics').upsert(clinic, { onConflict: 'id' });
    if (clinicErr) { console.error(`  ❌ ${clinic.name}: ${clinicErr.message}`); continue; }
    console.log(`  ✓ 병원: ${clinic.name}`);

    await supabase.from('categories').delete().eq('clinic_id', clinic.id);
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .insert({ clinic_id: clinic.id, name: cat.name, tag: cat.tag, sort_order: i + 1 })
        .select('id').single();
      if (catErr) { console.error(`    ❌ ${cat.name}: ${catErr.message}`); continue; }
      const treatments = cat.items.map((t, j) => ({
        category_id: catData.id, name: t.name,
        orig_price: t.orig ?? null, event_price: t.event ?? null, base_price: null, sort_order: j + 1,
      }));
      const { error: tErr } = await supabase.from('treatments').insert(treatments);
      if (tErr) console.error(`    ❌ Treatments: ${tErr.message}`);
    }
    await supabase.from('crawl_logs').insert({
      clinic_id: clinic.id, status: 'success',
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
      console.log('사용 가능:', SEOUL_BRANCHES.map(b => b.branch).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 유앤아이의원 VLM 크롤링 시작 (${branches.length}개 지점) ===`);

  const results = [];
  for (const branch of branches) {
    try {
      const data = await crawlBranch(branch);
      if (data && data.categories.length > 0) results.push(data);
    } catch (e) {
      console.error(`  ❌ ${branch.name}: ${e.message}`);
    }
  }

  console.log(`\n=== 크롤링 완료: ${results.length}/${branches.length} 지점 성공 ===`);
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
    const fs = await import('fs');
    fs.writeFileSync('./crawl-results-uni.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ./crawl-results-uni.json`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
