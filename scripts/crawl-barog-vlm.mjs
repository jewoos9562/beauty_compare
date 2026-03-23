/**
 * 바로그의원 (Barog Clinic) VLM 크롤러
 * Claude Sonnet Vision으로 이벤트 이미지에서 가격 데이터 추출
 *
 * Usage:
 *   node scripts/crawl-barog-vlm.mjs              # 크롤링만 (JSON 출력)
 *   node scripts/crawl-barog-vlm.mjs --seed       # 크롤링 + Supabase 시드
 *   node scripts/crawl-barog-vlm.mjs --branch gangnam  # 특정 지점만
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'REDACTED',
});

// ── 바로그 서울 지점 목록 ────────────────────────────────────────
const SEOUL_BRANCHES = [
  { code: 'br12', prefix: 'gangnam',   name: '바로그의원 강남점',   district: 'gangnam',   branch: 'gangnam' },
  { code: 'br06', prefix: 'balsan',    name: '바로그의원 발산점',   district: 'gangseo',   branch: 'balsan' },
  { code: 'br31', prefix: 'yeonsinnae',name: '바로그의원 연신내점', district: 'eunpyeong', branch: 'yeonsinnae' },
];

const CATEGORIES = ['botox', 'lifting', 'filler', 'skin', 'anti'];
const CAT_TAG_MAP = {
  botox: 'botox', lifting: 'lifting', filler: 'filler', skin: 'skincare', anti: 'skinbooster',
};
const CAT_NAME_MAP = {
  botox: '보톡스', lifting: '리프팅', filler: '필러', skin: '스킨케어', anti: '안티에이징',
};

function guessTag(categoryName) {
  const lower = categoryName.toLowerCase();
  if (/보톡스|톡신/.test(lower)) return 'botox';
  if (/필러/.test(lower)) return 'filler';
  if (/리프팅/.test(lower)) return 'lifting';
  if (/스킨부스터|부스터/.test(lower)) return 'skinbooster';
  if (/색소|레이저|토닝/.test(lower)) return 'laser';
  if (/제모/.test(lower)) return 'hair_removal';
  if (/스킨케어|관리/.test(lower)) return 'skincare';
  if (/바디|다이어트/.test(lower)) return 'body';
  if (/안티에이징/.test(lower)) return 'skinbooster';
  return null;
}

// ── 이미지 URL 생성 및 다운로드 ──────────────────────────────────
async function findEventImages(branchCode, prefix) {
  const basePatterns = [
    `https://barogclinic.com/img/event/main/${prefix}`,
    `https://barogclinic.com/img/event/main/${branchCode.replace('br', '')}`,
  ];

  const found = [];
  for (const cat of CATEGORIES) {
    for (const base of basePatterns) {
      for (let i = 1; i <= 10; i++) {
        const urls = [
          `${base}/main_evt_${String(i).padStart(2, '0')}.png`,
          `${base}/main_evt_${cat}_${String(i).padStart(2, '0')}.png`,
          `${base}/${cat}_${String(i).padStart(2, '0')}.png`,
          `${base}/${cat}.png`,
        ];
        for (const url of urls) {
          try {
            const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.ok) {
              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('image')) {
                found.push({ url, category: cat });
              }
            }
          } catch {}
        }
        if (i === 1 && found.filter(f => f.category === cat).length === 0) break;
      }
    }
  }

  // Also try direct numbered patterns
  for (let i = 1; i <= 20; i++) {
    for (const base of basePatterns) {
      const url = `${base}/main_evt_${String(i).padStart(2, '0')}.png`;
      if (!found.some(f => f.url === url)) {
        try {
          const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (res.ok && (res.headers.get('content-type') || '').includes('image')) {
            found.push({ url, category: 'general' });
          }
        } catch {}
      }
    }
  }

  return found;
}

async function fetchImageBase64(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

// ── Claude VLM으로 이미지에서 가격 추출 ──────────────────────────
async function extractPricesFromImages(images, branchName) {
  const batchSize = 5;
  const allItems = [];

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    console.log(`    🤖 VLM 분석 중... (${i + 1}-${Math.min(i + batchSize, images.length)}/${images.length})`);

    const content = [];
    for (const img of batch) {
      try {
        const base64 = await fetchImageBase64(img.url);
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: base64 },
        });
      } catch (e) {
        console.log(`    ⚠ 이미지 다운로드 실패: ${img.url}`);
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
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]);
        allItems.push(...items);
      }
    } catch (e) {
      console.log(`    ⚠ VLM 분석 실패: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return allItems;
}

// ── 지점 크롤링 ─────────────────────────────────────────────────
async function crawlBranch(branch) {
  console.log(`\n🔍 ${branch.name} (${branch.code})`);

  // 1) 이벤트 이미지 찾기
  console.log(`  📥 이미지 URL 탐색 중...`);
  const images = await findEventImages(branch.code, branch.prefix);

  if (images.length === 0) {
    console.log(`  ⚠ 이벤트 이미지를 찾을 수 없습니다`);
    return null;
  }
  console.log(`  📸 이벤트 이미지 ${images.length}개 발견`);

  // 최대 20개
  const limitedImages = images.slice(0, 20);

  // 2) VLM으로 가격 추출
  const items = await extractPricesFromImages(limitedImages, branch.name);
  if (items.length === 0) {
    console.log(`  ⚠ 가격 정보를 추출하지 못했습니다`);
    return null;
  }

  // 3) 카테고리별 그룹화
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
      id: `barog_${branch.branch}`,
      district_id: branch.district,
      name: branch.name,
      address: '서울',
      phone: '',
      note: 'VAT 별도',
      color: 'from-sky-500 to-blue-400',
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
      console.error(`❌ 지점을 찾을 수 없습니다`);
      console.log('사용 가능:', SEOUL_BRANCHES.map(b => b.branch).join(', '));
      process.exit(1);
    }
  }

  console.log(`=== 바로그의원 VLM 크롤링 시작 (${branches.length}개 지점) ===`);

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
    fs.writeFileSync('./crawl-results-barog.json', JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 결과 저장: ./crawl-results-barog.json`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
