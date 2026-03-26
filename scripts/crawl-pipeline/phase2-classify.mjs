/**
 * Phase 2: Haiku를 이용한 시술 분류 & 구조화
 *
 * 출력 필드:
 *   - treatment_name: 시술명 (순수 시술 이름만)
 *   - volume_or_count: 용량 or 횟수 (예: "100샷", "2cc", "50U", "1회")
 *   - area: 부위 (예: "전체얼굴", "눈", "이마", "겨드랑이")
 *   - promo: 프로모션 종류/조건 (예: "첫방문", "1+1", "이벤트", "화수목")
 */

import Anthropic from '@anthropic-ai/sdk';
import { MASTER_LIST, MAJOR_TO_TAG, SUB_TO_TAG } from './master-list.mjs';
import { chunkText, log } from './utils.mjs';

const anthropic = new Anthropic();

// 마스터 리스트를 프롬프트용 간결한 형태로 변환
function buildMasterListSummary() {
  const grouped = {};
  for (const item of MASTER_LIST) {
    const key = `${item.major} > ${item.sub}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item.name);
  }
  return Object.entries(grouped)
    .map(([key, names]) => `${key}: ${names.join(', ')}`)
    .join('\n');
}

const MASTER_SUMMARY = buildMasterListSummary();

function buildPrompt(rawText) {
  return `당신은 한국 피부과/성형외과 가격 데이터 전문가입니다.
아래 텍스트는 클리닉 웹사이트에서 추출된 내용입니다.

## 작업
1. 텍스트에서 시술명과 가격 정보를 모두 찾아주세요
2. 각 시술을 아래 마스터 분류에 매핑해주세요
3. 결과를 JSON으로 출력해주세요

## 마스터 분류 체계
${MASTER_SUMMARY}

## 출력 형식
반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "treatments": [
    {
      "treatment_name": "순수 시술명 (용량/횟수/부위/프로모션 제외)",
      "volume_or_count": "용량 or 횟수 (예: 100샷, 2cc, 50U, 1회, 3줄, 1시린지) 또는 null",
      "area": "부위 (예: 전체얼굴, 눈, 이마, 겨드랑이, 팔자, 사각턱) 또는 null",
      "promo": "프로모션 종류/조건 (예: 첫방문, 1+1, 체험가, 이벤트, 화수목, 남성전용, 1년무제한) 또는 null",
      "master_treatment": "마스터 리스트의 시술명 (매핑 가능한 경우) 또는 null",
      "master_major": "대분류 또는 null",
      "master_sub": "중분류 또는 null",
      "category_name": "사이트에서 이 시술이 속한 카테고리명 (보톡스, 필러, 리프팅 등 대분류 수준)",
      "orig_price": null,
      "event_price": null,
      "notes": null
    }
  ],
  "unmatched": [
    {
      "raw_text": "매핑 불가능한 항목의 원본 텍스트",
      "reason": "분류 불가 이유"
    }
  ]
}

## 필드 분리 예시
- "울쎄라 프라임 300샷 체험가" → treatment_name: "울쎄라 프라임", volume_or_count: "300샷", area: null, promo: "체험가"
- "국산 사각턱보톡스 50U 1+1" → treatment_name: "사각턱 보톡스", volume_or_count: "50U", area: "사각턱", promo: "1+1"
- "리쥬란힐러 2cc 첫방문 특가" → treatment_name: "리쥬란 힐러", volume_or_count: "2cc", area: null, promo: "첫방문"
- "겨드랑이 제모 1년 무제한" → treatment_name: "겨드랑이 제모", volume_or_count: null, area: "겨드랑이", promo: "1년 무제한"
- "인모드 FX+FORMA 전체얼굴" → treatment_name: "인모드 FX+FORMA", volume_or_count: null, area: "전체얼굴", promo: null
- "볼륨필러(쥬비덤) 1cc" → treatment_name: "볼륨필러 (쥬비덤)", volume_or_count: "1cc", area: null, promo: null
- "피코토닝 1+1 이벤트" → treatment_name: "피코 토닝", volume_or_count: null, area: null, promo: "1+1"

## category_name 규칙 (중요!)
- category_name은 반드시 다음 중 하나로 통일: 보톡스, 필러, 리프팅, 스킨부스터, 제모, 스킨케어, 미백/색소, 여드름/흉터, 바디, 일반관리, 비급여항목
- 사이트에서 "보톡스/윤곽주사"라고 되어있어도 → "보톡스"
- "필러/실리프팅" → 필러는 "필러", 실리프팅은 "리프팅"
- "레이저리프팅" → "리프팅"
- "최신제모 젠틀맥스프로플러스" → "제모"

## 가격 규칙
- 가격은 숫자만 (쉼표, 원, 만원 제거). 예: "35만원" → 350000, "9,900원" → 9900
- 취소선/할인 전 가격 = orig_price, 최종 할인가 = event_price
- 가격이 하나만 있으면 event_price에 넣기
- "상담 후 결정", "전화문의" 등은 건너뛰기

## 시술 규칙
- treatment_name에는 용량/횟수/부위/프로모션 정보를 넣지 마세요 (별도 필드에)
- treatment_name은 마스터 리스트의 시술명과 최대한 일치시키세요
- 국산/수입산 구분은 notes에 넣기 (예: "국산", "수입산-독일", "수입산-미국")
- 브랜드명이 있으면 notes에 넣기 (예: "뉴라미스", "쥬비덤", "레스틸렌")
- 패키지/세트는 promo에 "패키지" 표기하고 구성을 notes에

## 추출할 텍스트:
${rawText}`;
}

async function classifyChunk(rawText, chunkIndex, totalChunks) {
  const prompt = buildPrompt(rawText);

  log('info', `  Haiku 분류 중... (청크 ${chunkIndex + 1}/${totalChunks})`);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log('warn', `  청크 ${chunkIndex + 1}: JSON 파싱 실패`);
      return { treatments: [], unmatched: [] };
    }

    let jsonStr = jsonMatch[0];
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      log('warn', `  청크 ${chunkIndex + 1}: JSON 잘림 감지, 복구 시도`);
      const lastComplete = jsonStr.lastIndexOf('},');
      if (lastComplete > 0) {
        jsonStr = jsonStr.slice(0, lastComplete + 1) + '], "unmatched": []}';
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          const treatmentsMatch = jsonStr.match(/"treatments"\s*:\s*\[([\s\S]*)/);
          if (treatmentsMatch) {
            const arrStr = '[' + treatmentsMatch[1];
            const lastObj = arrStr.lastIndexOf('},');
            if (lastObj > 0) {
              try {
                const items = JSON.parse(arrStr.slice(0, lastObj + 1) + ']');
                parsed = { treatments: items, unmatched: [] };
              } catch {
                parsed = { treatments: [], unmatched: [] };
              }
            }
          }
        }
      }
      if (!parsed) parsed = { treatments: [], unmatched: [] };
    }

    log('info', `  청크 ${chunkIndex + 1}: ${parsed.treatments?.length || 0}개 시술 발견`);
    return parsed;
  } catch (e) {
    log('error', `  Haiku 호출 실패: ${e.message}`);
    return { treatments: [], unmatched: [] };
  }
}

// ── 두 항목 병합 (정보가 더 많은 쪽 우선) ─────────────────────────
function mergeTreatments(a, b) {
  return {
    treatment_name: a.treatment_name || b.treatment_name,
    volume_or_count: a.volume_or_count || b.volume_or_count,
    area: a.area || b.area,
    promo: a.promo || b.promo,
    master_treatment: a.master_treatment || b.master_treatment,
    master_major: a.master_major || b.master_major,
    master_sub: a.master_sub || b.master_sub,
    category_name: a.category_name || b.category_name,
    // 가격: 0/null이 아닌 쪽 우선
    orig_price: a.orig_price || b.orig_price,
    event_price: a.event_price || b.event_price,
    notes: a.notes || b.notes,
  };
}

// ── 글로벌 중복 제거 & 병합 ──────────────────────────────────────
function deduplicateTreatments(treatments) {
  // 1단계: 시술명+용량+부위+가격 완전 일치 → 단순 dedup
  // 2단계: 시술명+용량+부위 일치 but 한쪽 가격 없음 → 병합
  const byIdentity = new Map(); // normKey → treatment[]

  for (const t of treatments) {
    const normName = (t.treatment_name || '').replace(/\s+/g, '').toLowerCase();
    const normVol = (t.volume_or_count || '').replace(/\s+/g, '').toLowerCase();
    const normArea = (t.area || '').replace(/\s+/g, '').toLowerCase();
    const identityKey = `${normName}_${normVol}_${normArea}`;

    if (!byIdentity.has(identityKey)) {
      byIdentity.set(identityKey, []);
    }
    byIdentity.get(identityKey).push(t);
  }

  const result = [];
  for (const [, group] of byIdentity) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // 같은 identity 그룹 내에서 가격별로 서브그룹
    const byPrice = new Map();
    const noPriceItems = [];

    for (const t of group) {
      const priceKey = `${t.event_price || 0}_${t.orig_price || 0}`;
      if (!t.event_price && !t.orig_price) {
        // 가격 없는 항목 → 나중에 가격 있는 항목에 병합
        noPriceItems.push(t);
      } else if (!byPrice.has(priceKey)) {
        byPrice.set(priceKey, t);
      } else {
        // 같은 가격 → 병합
        byPrice.set(priceKey, mergeTreatments(byPrice.get(priceKey), t));
      }
    }

    // 가격 없는 항목들을 가격 있는 항목에 병합
    if (noPriceItems.length > 0 && byPrice.size > 0) {
      for (const noPrice of noPriceItems) {
        // 첫 번째 가격 있는 항목에 병합 (promo 등 정보 합치기)
        const firstKey = byPrice.keys().next().value;
        byPrice.set(firstKey, mergeTreatments(byPrice.get(firstKey), noPrice));
      }
    } else if (noPriceItems.length > 0 && byPrice.size === 0) {
      // 전부 가격 없음 → 하나로 병합
      let merged = noPriceItems[0];
      for (let i = 1; i < noPriceItems.length; i++) {
        merged = mergeTreatments(merged, noPriceItems[i]);
      }
      byPrice.set('no_price', merged);
    }

    result.push(...byPrice.values());
  }

  return result;
}

// ── 카테고리명 정규화 ────────────────────────────────────────────
const CATEGORY_NORMALIZE = {
  '보톡스/윤곽주사': '보톡스',
  '윤곽주사': '보톡스',
  '필러/실리프팅': '필러',
  '레이저리프팅': '리프팅',
  '실리프팅': '리프팅',
  '탄력/리프팅': '리프팅',
  '최신제모': '제모',
  '부위별 제모': '제모',
  '제모예약': '제모',
  '미백/기미/홍조/색소': '미백/색소',
  '기미/색소/홍조': '미백/색소',
  '피부/미백/기미/색소': '미백/색소',
  '피부재생': '스킨케어',
  '피부관리': '스킨케어',
  '일반관리': '스킨케어',
  '주사류': '스킨부스터',
  '줄기세포': '스킨부스터',
  '안티에이징': '스킨부스터',
  '다이어트': '바디',
  '바디리프팅': '바디',
  '바디토닝': '바디',
  '지방분해': '바디',
  '제로팻주사': '바디',
  '제로팻주사(얼굴/바디)': '바디',
  '퀵제로팻': '바디',
  '비급여항목': '비급여항목',
};

function normalizeCategory(catName) {
  if (!catName) return '기타';
  // 정확 매핑
  if (CATEGORY_NORMALIZE[catName]) return CATEGORY_NORMALIZE[catName];
  // 부분 매칭
  for (const [key, val] of Object.entries(CATEGORY_NORMALIZE)) {
    if (catName.includes(key)) return val;
  }
  // 기본 키워드 매칭
  if (/보톡스|톡신/.test(catName)) return '보톡스';
  if (/필러/.test(catName)) return '필러';
  if (/리프팅|써마지|울쎄라|슈링크|인모드/.test(catName)) return '리프팅';
  if (/부스터|리쥬란|쥬베룩/.test(catName)) return '스킨부스터';
  if (/제모/.test(catName)) return '제모';
  if (/색소|토닝|미백|기미/.test(catName)) return '미백/색소';
  if (/여드름|흉터|모공/.test(catName)) return '여드름/흉터';
  if (/스킨케어|관리|클렌징|LED/.test(catName)) return '스킨케어';
  if (/바디|다이어트|지방/.test(catName)) return '바디';
  return catName; // 정규화 안 되면 원본 유지
}

const CATEGORY_TAG = {
  '보톡스': 'botox',
  '필러': 'filler',
  '리프팅': 'lifting',
  '스킨부스터': 'skinbooster',
  '제모': 'hair_removal',
  '미백/색소': 'laser',
  '여드름/흉터': 'skincare',
  '스킨케어': 'skincare',
  '바디': 'body',
  '일반관리': 'skincare',
  '비급여항목': null,
};

// ── 결과를 최종 포맷으로 변환 ────────────────────────────────────
function convertToOutputFormat(allTreatments, clinicInfo) {
  // 1. 글로벌 중복 제거
  const deduped = deduplicateTreatments(allTreatments);
  log('info', `중복 제거: ${allTreatments.length} → ${deduped.length}`);

  // 2. 카테고리 정규화 후 그룹화
  const categoryMap = new Map();

  for (const t of deduped) {
    const rawCat = t.category_name || t.master_major || '기타';
    const catName = normalizeCategory(rawCat);
    const tag = CATEGORY_TAG[catName] || MAJOR_TO_TAG[t.master_major] || null;

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { name: catName, tag, items: [] });
    }

    const cat = categoryMap.get(catName);
    if (!cat.tag && tag) cat.tag = tag;

    cat.items.push({
      treatment_name: t.treatment_name || t.name || '',
      volume_or_count: t.volume_or_count || null,
      area: t.area || null,
      promo: t.promo || null,
      orig_price: t.orig_price || null,
      event_price: t.event_price || null,
      master_treatment: t.master_treatment || null,
      notes: t.notes || null,
    });
  }

  // 3. 카테고리 내 중복 제거 (같은 시술명+용량+부위+가격)
  for (const cat of categoryMap.values()) {
    const seen = new Set();
    cat.items = cat.items.filter(item => {
      const key = `${item.treatment_name}_${item.volume_or_count}_${item.area}_${item.event_price}_${item.orig_price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // 4. 카테고리 정렬 (항목 많은 순)
  const categories = [...categoryMap.values()]
    .filter(c => c.items.length > 0)
    .sort((a, b) => {
      // 주요 카테고리 순서
      const order = ['보톡스', '필러', '리프팅', '스킨부스터', '미백/색소', '여드름/흉터', '스킨케어', '제모', '바디', '비급여항목'];
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return b.items.length - a.items.length;
    });

  return { clinic: clinicInfo, categories };
}

// ── Phase 2 오케스트레이터 ──────────────────────────────────────
export async function phase2Classify(rawText, clinicInfo, options = {}) {
  log('info', `Phase 2 시작: Haiku 분류`);
  const startTime = Date.now();

  const chunks = chunkText(rawText);
  log('info', `${chunks.length}개 청크로 분할 (총 ${rawText.length}자)`);

  const allTreatments = [];
  const allUnmatched = [];

  for (let i = 0; i < chunks.length; i++) {
    const result = await classifyChunk(chunks[i], i, chunks.length);
    if (result.treatments) allTreatments.push(...result.treatments);
    if (result.unmatched) allUnmatched.push(...result.unmatched);
  }

  log('info', `총 ${allTreatments.length}개 시술 발견 (중복 제거 전), ${allUnmatched.length}개 미매핑`);

  const output = convertToOutputFormat(allTreatments, clinicInfo);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalItems = output.categories.reduce((sum, c) => sum + c.items.length, 0);
  log('success', `Phase 2 완료: ${output.categories.length}개 카테고리, ${totalItems}개 시술 (중복 제거 후), ${duration}초`);

  return {
    ...output,
    metadata: {
      totalRaw: allTreatments.length,
      totalDeduped: totalItems,
      unmatchedCount: allUnmatched.length,
      unmatched: allUnmatched,
      chunks: chunks.length,
      duration,
    },
  };
}
