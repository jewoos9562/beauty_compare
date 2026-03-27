/**
 * Phase 1.5: 전처리 & 규칙 기반 추출
 *
 * 정규식: 이름+가격 추출만 (정확한 것만)
 * LLM: 필드 분해 (area, volume, promo, master 매칭) — 추출된 리스트 대상
 */

import Anthropic from '@anthropic-ai/sdk';
import { MASTER_LIST, MAJOR_TO_TAG, SUB_TO_TAG, buildMasterSummary, buildAliasMap } from './master-list.mjs';
import { log } from './utils.mjs';
import crypto from 'crypto';

const anthropic = new Anthropic();

const MASTER_SUMMARY = buildMasterSummary();

// ── Alias auto-detection: alias → { masterName, alias } ──────────
const ALIAS_MAP = buildAliasMap(); // normalized alias string → master treatment name
// Build reverse: masterName → Set of original alias strings (non-normalized)
const MASTER_ALIASES_RAW = new Map();
for (const m of MASTER_LIST) {
  for (const a of m.aliases || []) {
    const normAlias = a.replace(/\s+/g, '').toLowerCase();
    const normMaster = m.name.replace(/\s+/g, '').toLowerCase();
    if (normAlias !== normMaster) {
      if (!MASTER_ALIASES_RAW.has(normAlias)) {
        MASTER_ALIASES_RAW.set(normAlias, { alias: a, masterName: m.name });
      }
    }
  }
}

/**
 * Auto-detect clinic_alias from raw_name when LLM didn't populate it.
 * If raw_name contains a known alias that maps to a different master name, return the alias.
 */
function detectClinicAlias(rawName, treatmentName) {
  if (!rawName) return null;
  const normRaw = rawName.replace(/\s+/g, '').toLowerCase();
  // Check each known alias against the raw_name
  for (const [normAlias, { alias, masterName }] of MASTER_ALIASES_RAW) {
    if (normRaw.includes(normAlias)) {
      // Verify the treatment was normalized to a different name
      const normTreatment = (treatmentName || '').replace(/\s+/g, '').toLowerCase();
      if (normTreatment !== normAlias) {
        return alias;  // e.g., "모공톡신" for "스킨 보톡스"
      }
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// 1. 텍스트 중복 제거
// ══════════════════════════════════════════════════════════════════

function deduplicateRawText(rawText) {
  const lines = rawText.split('\n');
  const seenHashes = new Set();
  const seenSubstrings = new Set();
  const result = [];
  let removedLines = 0;
  let navPattern = null;

  for (const line of lines) {
    if (!navPattern && /^KOR\s+ENG\s+JP/.test(line)) {
      navPattern = line.slice(0, 200);
      break;
    }
  }

  const MENU_PATTERNS = [
    /^1회 체험가\s+퀵제로팻/,
    /^시술소개\s+시술소개/,
    /^원내 사정에 따라 이벤트/,
    /^개인정보취급방침\s+이용약관/,
    /^Copyright\s+©/i,
    /^VandS Clinic SNS/,
    /^상담하기\s+바로예약/,
    /^소개\s+청담\s+밴스의원/,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') { removedLines++; continue; }

    if (/^===\s+(PAGE|PRICE BLOCKS|TABLES|IMAGE)/.test(trimmed)) {
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
      if (urlMatch) result.push(`[URL: ${urlMatch[0]}]`);
      continue;
    }

    if (navPattern && trimmed.startsWith(navPattern.slice(0, 50))) { removedLines++; continue; }
    if (MENU_PATTERNS.some(p => p.test(trimmed))) { removedLines++; continue; }

    if (trimmed.length > 100) {
      const hash = crypto.createHash('md5').update(trimmed).digest('hex');
      if (seenHashes.has(hash)) { removedLines++; continue; }
      seenHashes.add(hash);
    }

    if (trimmed.length > 20 && trimmed.length <= 100) {
      if (seenSubstrings.has(trimmed)) { removedLines++; continue; }
      seenSubstrings.add(trimmed);
    }

    result.push(trimmed);
  }

  return { cleaned: result.join('\n'), removedLines, originalLines: lines.length };
}

// ══════════════════════════════════════════════════════════════════
// 2. 가격 라인 필터링
// ══════════════════════════════════════════════════════════════════

const PRICE_INDICATORS = /\d{1,3}(,\d{3})+원?|\d+원|\d+%|예약|VAT|만원|할인|이벤트|체험가|무제한/;
const NOISE_PATTERNS = [
  /^(로그인|회원가입|소개|왜|오시는길|둘러보기|시술후기|전후사진|상담|예약|빠른예약|전화상담)/,
  /^(ENG|JP|简体|繁體|THAI|VIE|IDN|MN|RU)\b/,
  /^(Copyright|카카오|SNS|지점안내)\b/,
  /^https?:\/\//,
  /^서울\s+강남구.*대표번호/,
  /^대표자\./,
];

function filterPriceLines(text) {
  const lines = text.split('\n');
  const priceLines = [];
  let removedCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('[URL:')) { priceLines.push(trimmed); continue; }
    if (NOISE_PATTERNS.some(p => p.test(trimmed))) continue;
    if (PRICE_INDICATORS.test(trimmed)) {
      priceLines.push(trimmed);
    } else {
      removedCount++;
    }
  }

  return { priceText: priceLines.join('\n'), removedCount };
}

// ══════════════════════════════════════════════════════════════════
// 3. 정규식 추출 (이름 + 가격만, 필드 분해 안 함)
// ══════════════════════════════════════════════════════════════════

const CATEGORY_HEADERS = {
  '보톡스': '보톡스', '윤곽주사': '보톡스',
  // 대분류 매칭
  '보톡스': '보톡스', '윤곽주사': '보톡스',
  '필러': '필러',
  '실리프팅': '리프팅', '실 리프팅': '리프팅',
  '레이저리프팅': '리프팅', '탄력/리프팅': '리프팅', '레이저 리프팅': '리프팅',
  '스킨부스터': '피부-스킨부스터', '부스터필러': '피부-스킨부스터',
  '주사류': '피부-스킨부스터', '줄기세포': '피부-스킨부스터',
  '제모': '제모', '젠틀맥스': '제모',
  '여드름': '피부-여드름/흉터', '점제거': '피부-여드름/흉터',
  '미백': '피부-미백/토닝', '기미': '피부-미백/토닝', '색소': '피부-미백/토닝', '홍조': '피부-미백/토닝',
  '피부/미백': '피부-미백/토닝', '기미/색소/홍조': '피부-미백/토닝',
  '스킨케어': '피부-일반관리', '피부재생': '피부-여드름/흉터',
  '다이어트': '바디', '퀵제로팻': '바디', '제로팻': '바디', '지방분해': '바디',
  '비급여항목': '제증명', '코스메틱': '미분류',
  '제증명': '제증명', '수수료': '제증명',
  '약처방': '약처방',
};

function detectCategory(text) {
  for (const [keyword, cat] of Object.entries(CATEGORY_HEADERS)) {
    if (text.includes(keyword)) return cat;
  }
  return null;
}

function parsePrice(str) {
  if (!str) return null;
  const cleaned = str.replace(/[,원\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// 시술명 정리 (최소한의 정리만 — 필드 분해는 LLM이 함)
function cleanName(raw) {
  let name = raw.trim();
  // VAT 표기 제거
  name = name.replace(/\(VAT\s*:\s*[^)]*\)/gi, '');
  // "시술안내", "기본상품" 제거
  name = name.replace(/시술안내|기본상품/g, '');
  // "피부 및 연부조직" 접두어 제거 (테이블 소스)
  name = name.replace(/^피부 및 연부조직\s*/, '');
  // 앞에 붙은 가격 잔재 제거: "000원 " "99,000원 " 등
  name = name.replace(/^[\d,]+원\s+/, '');
  // 마케팅 문구 제거: 느낌표/별 이후의 핵심 부분만
  // "매월 천 명의 밴스어터가 찾는 베스트셀러 시술안내 ..." → 마지막 의미있는 부분
  const marketingCut = name.match(/[!★☆]([^!★☆]+)$/);
  if (marketingCut && marketingCut[1].trim().length > 3) {
    name = marketingCut[1].trim();
  }
  // 긴 설명문 정리: 30자 넘으면 마지막 공백 구분 명사구들만
  if (name.length > 60) {
    // "으로 피부 속부터 채우는 수분감 릴리이드 2cc" → "릴리이드 2cc"
    const words = name.split(/\s+/);
    // 뒤에서부터 가격/수량 관련 단어를 포함하는 부분 찾기
    let cutIdx = words.length;
    for (let i = words.length - 1; i >= 0; i--) {
      if (/[을를이가은는의로에서부터하고]$/.test(words[i]) && i < words.length - 2) {
        cutIdx = i + 1;
        break;
      }
    }
    if (cutIdx < words.length) {
      name = words.slice(cutIdx).join(' ');
    }
  }
  // 연속 공백 정리
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

function extractWithRegex(priceText) {
  const extracted = [];
  const unmatched = [];
  let currentCategory = null;

  const lines = priceText.split('\n');

  for (const line of lines) {
    if (line.startsWith('[URL:')) continue;

    const catMatch = detectCategory(line);
    if (catMatch) currentCategory = catMatch;

    // 1. 비급여수가 테이블 (파이프 구분) — 고정 컬럼 파싱
    if (line.includes('|') && /피부 및 연부조직/.test(line)) {
      const cells = line.split('|').map(c => c.trim());
      // 컬럼 구조: [빈칸|행위료], 대분류(피부및연부조직), 중분류, [빈칸|코드], 명칭, 구분, [빈칸], 최저가, 최고가, X, X, 특이사항, 날짜
      // 중분류/명칭/구분/가격/특이사항 추출
      let midCat = '', treatName = '', spec = '', note = '';
      let minPrice = null, maxPrice = null;

      // 숫자(가격) 셀 위치 찾기
      const priceIndices = [];
      for (let ci = 0; ci < cells.length; ci++) {
        if (/^[\d,]+$/.test(cells[ci].replace(/\s/g, '')) && cells[ci].length > 0) {
          priceIndices.push(ci);
        }
      }
      if (priceIndices.length < 1) continue;

      // 첫 번째 가격 앞에 있는 비어있지 않은 텍스트 셀들 추출
      const firstPriceIdx = priceIndices[0];
      const textBefore = [];
      for (let ci = 0; ci < firstPriceIdx; ci++) {
        const c = cells[ci].trim();
        if (c && c !== 'X' && !/^피부 및 연부조직$/.test(c) && !/^행위료$/.test(c) && !/^\d{4}-\d{2}-\d{2}$/.test(c)) {
          textBefore.push(c);
        }
      }

      // 가격 뒤 특이사항 추출 (X, 날짜 제외)
      for (let ci = priceIndices[priceIndices.length - 1] + 1; ci < cells.length; ci++) {
        const c = cells[ci].trim();
        if (c && c !== 'X' && !/^\d{4}-\d{2}-\d{2}$/.test(c) && c.length > 1) {
          note = c;
          break;
        }
      }

      // textBefore: [중분류, (빈칸), 명칭, 구분] 또는 [중분류, 명칭, 구분]
      if (textBefore.length >= 2) {
        midCat = textBefore[0]; // 중분류 (보톡스, 필러, 제모 등)
        treatName = textBefore[textBefore.length >= 3 ? textBefore.length - 2 : 1]; // 명칭
        spec = textBefore.length >= 3 ? textBefore[textBefore.length - 1] : ''; // 구분 (국산, 1회, 2cc 등)
      } else if (textBefore.length === 1) {
        treatName = textBefore[0];
      }

      if (!treatName) continue;

      minPrice = parsePrice(cells[priceIndices[0]]);
      maxPrice = priceIndices.length >= 2 ? parsePrice(cells[priceIndices[1]]) : null;

      // raw_name: 모든 컨텍스트 포함 → LLM이 필드 분해
      // 예: "볼륨필러(아띠에르) | 구분:국산 | 특이:1cc 당"
      const parts = [treatName];
      if (spec) parts.push(`구분:${spec}`);
      if (note) parts.push(`특이:${note}`);
      const rawName = parts.join(' | ');

      const detectedCat = detectCategory(midCat) || detectCategory(treatName) || currentCategory;

      extracted.push({
        raw_name: rawName,
        category_name: detectedCat || midCat,
        event_price: minPrice,
        orig_price: maxPrice,
        source: 'regex-table',
      });
      continue;
    }

    // 2. Product 페이지: "시술명 예약 가격원 할인% 원래가격원"
    let match;
    const patternFull = /([^예약]+?)\s+예약\s+([\d,]+)원\s+(\d+)%\s+([\d,]+)원/g;
    let found = false;
    while ((match = patternFull.exec(line)) !== null) {
      found = true;
      const rawName = cleanName(match[1]);
      if (rawName.length < 2) continue;

      extracted.push({
        raw_name: rawName,
        category_name: currentCategory || detectCategory(match[1]),
        event_price: parsePrice(match[2]),
        orig_price: parsePrice(match[4]),
        source: 'regex-product',
      });
    }

    // 3. 단순 패턴: "시술명 예약 가격원"
    if (!found) {
      const patternSimple = /([^예약]+?)\s+예약\s+([\d,]+)원/g;
      while ((match = patternSimple.exec(line)) !== null) {
        found = true;
        const rawName = cleanName(match[1]);
        if (rawName.length < 2) continue;

        extracted.push({
          raw_name: rawName,
          category_name: currentCategory || detectCategory(match[1]),
          event_price: parsePrice(match[2]),
          orig_price: null,
          source: 'regex-simple',
        });
      }
    }

    // 정규식 실패 → Phase 2용
    if (!found && PRICE_INDICATORS.test(line) && line.length > 15) {
      unmatched.push(line);
    }
  }

  return { extracted, unmatchedText: unmatched.join('\n') };
}

// ══════════════════════════════════════════════════════════════════
// 4. 중복 제거 (이름+가격 기준)
// ══════════════════════════════════════════════════════════════════

function deduplicateExtracted(items) {
  const seen = new Map();
  for (const item of items) {
    const norm = item.raw_name.replace(/\s+/g, '').toLowerCase();
    const price = item.event_price || 0;
    const key = `${norm}_${price}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

// ══════════════════════════════════════════════════════════════════
// 5. LLM 필드 분해 (추출된 리스트 대상 — 매우 저렴)
// ══════════════════════════════════════════════════════════════════

function buildRefinePrompt(items) {
  const itemList = items.map((it, i) =>
    `${i + 1}. "${it.raw_name}" | 카테고리: ${it.category_name || '?'} | 이벤트가: ${it.event_price || '?'} | 원래가: ${it.orig_price || '?'}`
  ).join('\n');

  return `당신은 한국 피부과/성형외과 시술 데이터 전문가입니다.
아래는 클리닉 홈페이지에서 추출한 시술 항목 리스트입니다. 각 항목의 raw_name을 분석하여 구조화해주세요.

## 마스터 분류 체계 (대분류 > 중분류: 시술명[목적키워드])
${MASTER_SUMMARY}

## 대분류 목록
- 리프팅 (레이저 리프팅, 실 리프팅)
- 필러 (얼굴 필러, 바디 필러)
- 보톡스 (얼굴 보톡스, 바디 보톡스)
- 피부 (미백/토닝, 스킨부스터, 여드름/흉터, 일반관리)
- 바디 (지방분해주사, 바디필러, 바디토닝)
- 제모 (부위별 제모)
- 약처방 (다이어트 약)
- 제증명 (진단서, 소견서, 확인서 등 서류 수수료)

## 분해 규칙
- treatment_name: 마스터 리스트의 시술명으로 통일. 별칭(aliases)에 해당하면 마스터 시술명으로 변환. (예: "모공톡신" → "스킨 보톡스")
- clinic_alias: 클리닉이 사용하는 원래 이름이 마스터 시술명과 다를 경우 원래 이름 (예: "모공톡신", "밴스란힐러"). 같으면 null
- volume_or_count: 용량/횟수 (예: "50U", "2cc", "100샷", "1회", "3줄") 또는 null
- area: 시술 부위 (예: "사각턱", "겨드랑이", "전체얼굴", "이마", "코") 또는 null
- promo: 프로모션/조건 (예: "무제한", "1+1", "체험가", "첫방문") 또는 null
- purpose: 목적 키워드 (마스터 리스트의 목적 참고, "/"는 OR. 예: "주름", "탄력", "미백", "지방", "모공", "다한증") 또는 null
- master_treatment: 마스터 리스트의 **정확한** 시술명 또는 null. 반드시 위 리스트에 있는 이름만 사용
- master_major: 대분류 (리프팅/필러/보톡스/피부/바디/제모/약처방/제증명/미분류)
- master_sub: 중분류 또는 null
- notes: 원산지(국산/미국산/독일산 등), 브랜드명, 기타. 원산지는 구체적으로 (예: "국산", "미국산", "독일산", "미국산-엘러간"). "수입산"만 있으면 구체적 국가를 추론하되, 모르면 "수입산" 유지

## 제증명 판별 규칙
- "진단서", "소견서", "확인서", "진료확인서", "일반진단서", "사본" 등 → master_major: "제증명"
- 실제 시술이 아닌 서류 발급 수수료는 모두 "제증명"으로 분류

## 볼륨필러 / 주름필러 분류 규칙
- "볼륨필러"는 부위를 알 수 없을 때 master_treatment을 null로. 부위가 명시되면 해당 부위 필러로 매칭 (예: 볼 → "옆볼 필러")
- "주름필러"도 부위별로 매칭. 부위 불명 시 null

## 예시
- "사각턱보톡스 50유닛 | 구분:국산" → {treatment_name:"사각턱 보톡스", clinic_alias:null, volume:"50유닛", area:"사각턱", purpose:"근육", notes:"국산", master_treatment:"사각턱 보톡스", master_major:"보톡스", master_sub:"얼굴 보톡스"}
- "모공톡신 1cc" → {treatment_name:"스킨 보톡스", clinic_alias:"모공톡신", volume:"1cc", purpose:"모공", notes:null, master_treatment:"스킨 보톡스", master_major:"보톡스", master_sub:"얼굴 보톡스"}
- "밴스란힐러 1cc" → {treatment_name:"리쥬란 힐러", clinic_alias:"밴스란힐러", volume:"1cc", purpose:"탄력/주름/수분", master_treatment:"리쥬란 힐러", master_major:"피부", master_sub:"스킨부스터"}
- "볼륨필러(아띠에르) | 구분:국산 | 특이:1cc 당" → {treatment_name:"볼륨필러", clinic_alias:null, volume:"1cc", purpose:"볼륨", notes:"국산-아띠에르", master_major:"필러", master_sub:"얼굴 필러"}
- "엘러간주름보톡스 1부위" → {treatment_name:"주름 보톡스", clinic_alias:null, volume:null, area:null, purpose:"주름", notes:"미국산-엘러간", master_major:"보톡스", master_sub:"얼굴 보톡스"}
- "제오민주름보톡스" → {treatment_name:"주름 보톡스", clinic_alias:null, notes:"독일산-제오민", master_major:"보톡스"}
- "남자 인중+콧수염 | 구분:1회" → {treatment_name:"얼굴 제모", clinic_alias:null, volume:"1회", area:"인중+콧수염", purpose:"제모", notes:"남성", master_treatment:"얼굴 제모", master_major:"제모", master_sub:"부위별 제모"}
- "슈링크 유니버스 | 구분:1회 | 특이:100샷 기준" → {treatment_name:"슈링크 유니버스", clinic_alias:null, volume:"100샷", master_treatment:"슈링크 유니버스", master_major:"리프팅", master_sub:"레이저 리프팅"}
- "무제한 코필러" → {treatment_name:"코 필러", clinic_alias:null, area:"코", promo:"무제한", master_treatment:"코 필러", master_major:"필러", master_sub:"얼굴 필러"}
- "포텐자콜라스터 | 구분:1회" → {treatment_name:"포텐자", clinic_alias:null, volume:"1회", purpose:"모공/흉터", master_treatment:"포텐자", master_major:"피부", master_sub:"여드름/흉터"}

## 주의사항
- "구분:" 뒤의 값은 국산/수입산일 수도 있고, 용량(1회, 2cc)일 수도 있고, 크기(2mm이하)일 수도 있음 → 의미를 파악해서 올바른 필드에 배치
- "특이:" 뒤의 값은 보통 단위당 정보(1cc 당, 100샷 기준)이거나 조건(*부위별 가격 상이) → 단위정보는 volume_or_count로, 조건은 notes로
- 중분류가 "제모"인 경우: raw_name에서 부위를 추출해 area로, "남자/여자/여성" → notes에 "남성/여성"으로
- 브랜드명이 괄호 안에 있으면 (쥬비덤, 아띠에르 등) notes에 추출
- 목적(purpose)은 해당 시술이 어떤 목적으로 사용되는지. 슬래시(/)는 OR 의미

## 출력 형식 (JSON만, 다른 텍스트 없이)
[
  {"idx": 1, "treatment_name": "...", "clinic_alias": "...", "volume_or_count": "...", "area": "...", "promo": "...", "purpose": "...", "master_treatment": "...", "master_major": "...", "master_sub": "...", "notes": "..."},
  ...
]

## 항목 리스트
${itemList}`;
}

async function refineWithLlm(items) {
  if (items.length === 0) return [];

  // 배치 분할 (Haiku에 한번에 ~150개씩)
  const batchSize = 150;
  const allRefined = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);

    log('info', `  필드 분해 LLM 배치 ${batchNum}/${totalBatches} (${batch.length}개)`);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16384,
        messages: [{ role: 'user', content: buildRefinePrompt(batch) }],
      });

      const text = response.content[0].text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        log('warn', `  배치 ${batchNum}: JSON 파싱 실패`);
        // 실패 시 원본 유지
        for (const item of batch) {
          allRefined.push({
            treatment_name: item.raw_name, clinic_alias: null,
            volume_or_count: null, area: null, promo: null, purpose: null,
            master_treatment: null, master_major: null, master_sub: null, notes: null,
          });
        }
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // JSON 잘림 복구
        let jsonStr = jsonMatch[0];
        const lastComplete = jsonStr.lastIndexOf('},');
        if (lastComplete > 0) {
          try {
            parsed = JSON.parse(jsonStr.slice(0, lastComplete + 1) + ']');
          } catch {
            parsed = [];
          }
        } else {
          parsed = [];
        }
        log('warn', `  배치 ${batchNum}: JSON 복구 → ${parsed.length}개`);
      }

      // idx로 매칭
      const byIdx = new Map();
      for (const p of parsed) byIdx.set(p.idx, p);

      for (let j = 0; j < batch.length; j++) {
        const refined = byIdx.get(j + 1);
        if (refined) {
          // Auto-detect clinic_alias from raw_name if LLM didn't set it
          let clinicAlias = refined.clinic_alias || null;
          if (!clinicAlias) {
            clinicAlias = detectClinicAlias(batch[j].raw_name, refined.treatment_name);
          }
          allRefined.push({
            treatment_name: refined.treatment_name || batch[j].raw_name,
            clinic_alias: clinicAlias,
            volume_or_count: refined.volume_or_count || null,
            area: refined.area || null,
            promo: refined.promo || null,
            purpose: refined.purpose || null,
            master_treatment: refined.master_treatment || null,
            master_major: refined.master_major || null,
            master_sub: refined.master_sub || null,
            notes: refined.notes || null,
          });
        } else {
          // Also try auto-detect for unmatched items
          const autoAlias = detectClinicAlias(batch[j].raw_name, batch[j].raw_name);
          allRefined.push({
            treatment_name: batch[j].raw_name,
            clinic_alias: autoAlias,
            volume_or_count: null, area: null, promo: null, purpose: null,
            master_treatment: null, master_major: null, master_sub: null, notes: null,
          });
        }
      }

      log('info', `  배치 ${batchNum}: ${parsed.length}개 분해 완료`);
    } catch (e) {
      log('error', `  LLM 호출 실패: ${e.message}`);
      for (const item of batch) {
        allRefined.push({
          treatment_name: item.raw_name, clinic_alias: null,
          volume_or_count: null, area: null, promo: null,
          master_treatment: null, master_major: null, master_sub: null, notes: null,
        });
      }
    }
  }

  return allRefined;
}

// ══════════════════════════════════════════════════════════════════
// Phase 1.5 오케스트레이터
// ══════════════════════════════════════════════════════════════════

export async function phase15Preprocess(rawText, options = {}) {
  const startTime = Date.now();
  log('info', 'Phase 1.5 시작: 전처리 & 정규식 추출');

  // Step 1: 텍스트 중복 제거
  const { cleaned, removedLines, originalLines } = deduplicateRawText(rawText);
  log('info', `  텍스트 dedup: ${originalLines}줄 → ${originalLines - removedLines}줄 (${removedLines}줄 제거, ${rawText.length}자 → ${cleaned.length}자)`);

  // Step 2: 가격 라인 필터링
  const { priceText, removedCount } = filterPriceLines(cleaned);
  log('info', `  가격 필터: ${removedCount}줄 비가격 텍스트 제거 → ${priceText.length}자`);

  // Step 3: 정규식 추출 (이름+가격만)
  const { extracted, unmatchedText } = extractWithRegex(priceText);
  log('info', `  정규식 추출: ${extracted.length}개 항목`);

  // Step 4: 중복 제거
  const deduped = deduplicateExtracted(extracted);
  log('info', `  항목 dedup: ${extracted.length} → ${deduped.length}`);

  // Step 5: LLM 필드 분해 (추출된 리스트 대상)
  let refinedItems;
  if (!options.skipLlm && process.env.ANTHROPIC_API_KEY) {
    log('info', `  LLM 필드 분해: ${deduped.length}개 항목`);
    const refined = await refineWithLlm(deduped);

    // 원본 가격/카테고리와 병합
    refinedItems = deduped.map((orig, i) => ({
      ...refined[i],
      category_name: orig.category_name,
      event_price: orig.event_price,
      orig_price: orig.orig_price,
      source: orig.source,
    }));
  } else {
    // LLM 없이 원본 유지
    refinedItems = deduped.map(orig => ({
      treatment_name: orig.raw_name, clinic_alias: null,
      volume_or_count: null, area: null, promo: null,
      master_treatment: null, master_major: null, master_sub: null, notes: null,
      category_name: orig.category_name,
      event_price: orig.event_price,
      orig_price: orig.orig_price,
      source: orig.source,
    }));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = {
    originalChars: rawText.length,
    afterDedup: cleaned.length,
    afterFilter: priceText.length,
    regexExtracted: deduped.length,
    unmatchedChars: unmatchedText.length,
    savedPercent: ((1 - unmatchedText.length / rawText.length) * 100).toFixed(1),
    duration,
  };

  log('success', `Phase 1.5 완료: ${deduped.length}개 추출, 잔여 ${unmatchedText.length}자 → LLM, ${duration}초`);

  return { regexItems: refinedItems, unmatchedText, stats };
}
