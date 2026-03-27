#!/usr/bin/env node
/**
 * 범용 클리닉 크롤링 파이프라인 v2
 *
 * Phase 1:   웹 크롤링 → raw 텍스트
 * Phase 1.5: 전처리 + 정규식 추출 (LLM 비용 80% 절감)
 * Phase 2:   잔여분만 Haiku LLM 분류
 *
 * Usage:
 *   node scripts/crawl-pipeline/index.mjs --url https://clinic.com
 *   node scripts/crawl-pipeline/index.mjs --raw-input ./pipeline-raw-xxx.txt --clinic-id xxx
 *   node scripts/crawl-pipeline/index.mjs --url https://clinic.com --dry-run
 */

import fs from 'fs';
import { phase1Extract } from './phase1-extract.mjs';
import { phase15Preprocess } from './phase1-preprocess.mjs';
import { phase2Classify } from './phase2-classify.mjs';
import { MAJOR_TO_TAG, SUB_TO_TAG, MASTER_LIST, buildAliasMap } from './master-list.mjs';
import { log } from './utils.mjs';

// ── Alias auto-detection for mergeResults ──────────────────────────
const ALIAS_LOOKUP = new Map(); // normAlias → { alias, masterName }
for (const m of MASTER_LIST) {
  for (const a of m.aliases || []) {
    const normAlias = a.replace(/\s+/g, '').toLowerCase();
    const normMaster = m.name.replace(/\s+/g, '').toLowerCase();
    if (normAlias !== normMaster) {
      if (!ALIAS_LOOKUP.has(normAlias)) {
        ALIAS_LOOKUP.set(normAlias, { alias: a, masterName: m.name, master: m });
      }
    }
  }
}

// Volume/count patterns to extract from remaining text after alias removal
const VOL_PATTERN = /(\d+(?:\.\d+)?)\s*(cc|ml|유닛|unit|샷|줄|부위|회|kj|mg|개)/i;
const AREA_PATTERN = /(얼굴|눈밑|눈가|이마|볼|턱|코|입술|목|팔|다리|종아리|겨드랑이|브라질리언|인중|콧수염|사각턱|승모근|손등|발등|하관|앞목)/;

function autoEnrichAlias(item) {
  if (item.clinic_alias) return item; // already set
  const rawTn = item.treatment_name || '';
  const tn = rawTn.replace(/\s+/g, '').toLowerCase();
  for (const [normAlias, { alias, masterName, master }] of ALIAS_LOOKUP) {
    if (tn.includes(normAlias)) {
      // Extract volume/area from the remaining text after the alias
      const remaining = rawTn.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
      // Also try removing the normalized version
      const remaining2 = rawTn.replace(/\s+/g, '').replace(new RegExp(normAlias, 'i'), '').trim();

      let volume = item.volume_or_count || null;
      let area = item.area || null;
      if (!volume) {
        const volMatch = (remaining || remaining2).match(VOL_PATTERN);
        if (volMatch) volume = `${volMatch[1]}${volMatch[2]}`;
      }
      if (!area) {
        const areaMatch = (remaining || remaining2).match(AREA_PATTERN);
        if (areaMatch) area = areaMatch[1];
      }

      return {
        ...item,
        clinic_alias: alias,
        treatment_name: masterName,
        volume_or_count: volume,
        area: area,
        master_treatment: item.master_treatment || masterName,
        master_major: item.master_major || master.major,
        master_sub: item.master_sub || master.sub,
      };
    }
  }
  return item;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  return {
    url: get('--url'),
    clinicId: get('--clinic-id'),
    clinicName: get('--clinic-name'),
    district: get('--district') || 'gangnam',
    maxPages: parseInt(get('--max-pages') || '200', 10),
    maxImages: parseInt(get('--max-images') || '30', 10),
    output: get('--output'),
    rawInput: get('--raw-input'),
    dryRun: args.includes('--dry-run'),
    skipLlm: args.includes('--skip-llm'),  // Phase 2 스킵 (정규식만)
    verbose: args.includes('--verbose'),
  };
}

// ── 카테고리: master_major 기반 (새 마스터 리스트) ─────────────────
// 정규식 category_name → master_major 정규화
const CATEGORY_NORMALIZE = {
  '피부-스킨부스터': '피부',
  '피부-미백/토닝': '피부',
  '피부-여드름/흉터': '피부',
  '피부-일반관리': '피부',
};

const CATEGORY_ORDER = ['리프팅', '필러', '보톡스', '피부', '바디', '제모', '약처방', '제증명', '미분류'];

// ── 정규식 결과 + LLM 결과 병합 ─────────────────────────────────
function resolveMajor(item) {
  // LLM이 판단한 master_major 우선, 없으면 정규식 category_name 정규화
  if (item.master_major && CATEGORY_ORDER.includes(item.master_major)) return item.master_major;
  const catName = item.category_name || '';
  const normalized = CATEGORY_NORMALIZE[catName] || catName;
  if (CATEGORY_ORDER.includes(normalized)) return normalized;
  return '미분류';
}

// Clean treatment_name: remove inline tags like [지방감소/리프팅]
function cleanTreatmentName(name) {
  if (!name) return name;
  // Remove [...] suffixes that are purpose/tag annotations
  return name.replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function mergeResults(regexItems, llmResult, clinicInfo) {
  // 0. Auto-enrich aliases on ALL items BEFORE categorizing
  let aliasEnriched = 0;
  const enrichedRegex = regexItems.map(item => {
    const enriched = autoEnrichAlias(item);
    if (enriched.clinic_alias && !item.clinic_alias) aliasEnriched++;
    return enriched;
  });

  const categoryMap = new Map();

  // 1. 정규식 항목 추가 — master_major 기반 카테고리 (enriched 사용)
  for (const item of enrichedRegex) {
    // Clean treatment name
    item.treatment_name = cleanTreatmentName(item.treatment_name);

    const catName = resolveMajor(item);
    const tag = MAJOR_TO_TAG[catName] || null;
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { name: catName, tag, items: [] });
    }
    categoryMap.get(catName).items.push({
      treatment_name: item.treatment_name,
      clinic_alias: item.clinic_alias || null,
      volume_or_count: item.volume_or_count,
      area: item.area,
      promo: item.promo,
      purpose: item.purpose,
      orig_price: item.orig_price,
      event_price: item.event_price,
      master_treatment: item.master_treatment,
      master_major: item.master_major,
      master_sub: item.master_sub,
      notes: item.notes,
      source: item.source,
    });
  }

  // 2. LLM 항목 추가 (Phase 2가 있을 경우) — also enrich aliases
  let llmItemCount = 0;
  if (llmResult?.categories) {
    for (const cat of llmResult.categories) {
      for (const rawItem of cat.items) {
        const item = autoEnrichAlias(rawItem);
        if (item.clinic_alias && !rawItem.clinic_alias) aliasEnriched++;
        item.treatment_name = cleanTreatmentName(item.treatment_name);
        item.source = 'llm';

        // Use master_major from enrichment, fallback to LLM category
        const catName = resolveMajor({ ...item, category_name: cat.name });
        const tag = MAJOR_TO_TAG[catName] || null;
        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, { name: catName, tag, items: [] });
        }
        categoryMap.get(catName).items.push(item);
        llmItemCount++;
      }
    }
  }

  // 3. 카테고리 내 중복 제거
  let totalBefore = 0;
  let totalAfter = 0;
  for (const cat of categoryMap.values()) {
    totalBefore += cat.items.length;
    const seen = new Map();
    for (const item of cat.items) {
      const normName = (item.treatment_name || '').replace(/\s+/g, '').toLowerCase();
      const normVol = (item.volume_or_count || '').replace(/\s+/g, '').toLowerCase();
      const normArea = (item.area || '').replace(/\s+/g, '').toLowerCase();
      const price = item.event_price || 0;
      const key = `${normName}_${normVol}_${normArea}_${price}`;

      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        // 병합 (LLM 결과가 더 정확할 수 있으므로 LLM 우선)
        const existing = seen.get(key);
        if (item.source === 'llm' && existing.source !== 'llm') {
          seen.set(key, { ...existing, ...item, source: 'merged' });
        } else {
          seen.set(key, {
            ...item,
            treatment_name: existing.treatment_name || item.treatment_name,
            volume_or_count: existing.volume_or_count || item.volume_or_count,
            area: existing.area || item.area,
            promo: existing.promo || item.promo,
            purpose: existing.purpose || item.purpose,
            orig_price: existing.orig_price || item.orig_price,
            master_treatment: existing.master_treatment || item.master_treatment,
            master_major: existing.master_major || item.master_major,
            master_sub: existing.master_sub || item.master_sub,
            notes: existing.notes || item.notes,
            source: 'merged',
          });
        }
      }
    }
    cat.items = [...seen.values()];
    totalAfter += cat.items.length;
  }

  log('info', `  병합 dedup: ${totalBefore} → ${totalAfter} (정규식 ${regexItems.length} + LLM ${llmItemCount})`);

  if (aliasEnriched > 0) log('info', `  별칭 자동 감지: ${aliasEnriched}개`);

  // 4. 카테고리 정렬
  const categories = [...categoryMap.values()]
    .filter(c => c.items.length > 0)
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.name);
      const bi = CATEGORY_ORDER.indexOf(b.name);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return b.items.length - a.items.length;
    });

  return { clinic: clinicInfo, categories };
}

async function main() {
  const opts = parseArgs();

  if (!opts.url && !opts.rawInput) {
    console.log(`
범용 클리닉 크롤링 파이프라인 v2

Usage:
  node scripts/crawl-pipeline/index.mjs --url <URL> [options]
  node scripts/crawl-pipeline/index.mjs --raw-input <file> --clinic-id <id> [options]

Options:
  --url <url>            클리닉 홈페이지 URL
  --raw-input <file>     저장된 Phase 1 텍스트 (Phase 1 스킵)
  --clinic-id <id>       클리닉 ID
  --clinic-name <name>   클리닉 이름
  --district <id>        지역 ID (기본: gangnam)
  --max-pages <n>        최대 크롤링 페이지 수 (기본: 200)
  --max-images <n>       최대 VLM 이미지 수 (기본: 30)
  --output <path>        JSON 출력 경로
  --dry-run              Phase 1만 실행
  --skip-llm             Phase 2 스킵 (정규식만)
  --verbose              상세 로그
`);
    process.exit(1);
  }

  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  범용 크롤링 파이프라인 v2`);
  console.log(`  URL: ${opts.url || opts.rawInput}`);
  console.log(`${'='.repeat(60)}\n`);

  // ── Phase 1: Raw Extraction ──
  let combinedText;
  let phase1Pages = 0;
  let phase1Images = 0;

  if (opts.rawInput) {
    combinedText = fs.readFileSync(opts.rawInput, 'utf-8');
    log('info', `Phase 1 스킵 - 저장된 텍스트 사용: ${opts.rawInput} (${combinedText.length}자)`);
  } else {
    // API key 확인 (Phase 1에서는 이미지 OCR에만 필요)
    const phase1Result = await phase1Extract(opts.url, {
      maxPages: opts.maxPages,
      maxImages: opts.maxImages,
    });
    combinedText = phase1Result.combinedText;
    phase1Pages = phase1Result.pages.length;
    phase1Images = phase1Result.imageCount;

    const rawPath = `./pipeline-raw-${opts.clinicId || 'output'}.txt`;
    fs.writeFileSync(rawPath, combinedText, 'utf-8');
    log('info', `Phase 1 텍스트 저장: ${rawPath}`);
  }

  if (opts.dryRun) {
    log('success', `Phase 1 완료 (${combinedText.length}자)`);
    return;
  }

  // ── Phase 1.5: 전처리 + 정규식 추출 ──
  const { regexItems, unmatchedText, stats: ppStats } = await phase15Preprocess(combinedText, { skipLlm: opts.skipLlm });

  // ── Phase 2: LLM 분류 (잔여분만) ──
  const clinicInfo = {
    id: opts.clinicId || `clinic_${Date.now()}`,
    district_id: opts.district,
    name: opts.clinicName || opts.url,
    address: '서울',
    phone: '',
    note: '',
    color: 'from-indigo-500 to-blue-400',
  };

  let llmResult = null;
  let llmChunks = 0;

  if (!opts.skipLlm && unmatchedText.length > 50) {
    if (!process.env.ANTHROPIC_API_KEY) {
      log('warn', 'ANTHROPIC_API_KEY 없음 - Phase 2 스킵');
    } else {
      log('info', `Phase 2: 잔여 ${unmatchedText.length}자를 Haiku로 분류`);
      llmResult = await phase2Classify(unmatchedText, clinicInfo);
      llmChunks = llmResult.metadata?.chunks || 0;
    }
  } else if (opts.skipLlm) {
    log('info', 'Phase 2 스킵 (--skip-llm)');
  } else {
    log('info', 'Phase 2 스킵 (잔여 텍스트 없음)');
  }

  // ── 결과 병합 ──
  const result = mergeResults(regexItems, llmResult, clinicInfo);

  // 메타데이터
  result.metadata = {
    phase1: { pages: phase1Pages, images: phase1Images, chars: combinedText.length },
    phase15: ppStats,
    phase2: llmResult?.metadata || null,
    totalItems: result.categories.reduce((sum, c) => sum + c.items.length, 0),
    regexItems: regexItems.length,
    llmItems: llmResult ? llmResult.categories?.reduce((sum, c) => sum + c.items.length, 0) || 0 : 0,
  };

  // 결과 저장
  const outputPath = opts.output || `./crawl-results-pipeline-${opts.clinicId || 'output'}-v2.json`;
  fs.writeFileSync(outputPath, JSON.stringify([result], null, 2), 'utf-8');

  // ── 요약 출력 ──
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalItems = result.metadata.totalItems;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  크롤링 완료 요약 (v2)`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  URL: ${opts.url || opts.rawInput}`);
  console.log(`  Phase 1 (크롤링): ${phase1Pages}페이지, ${phase1Images}이미지`);
  console.log(`  Phase 1.5 (전처리):`);
  console.log(`    원본: ${ppStats.originalChars}자 → dedup: ${ppStats.afterDedup}자 → 필터: ${ppStats.afterFilter}자`);
  console.log(`    정규식 추출: ${ppStats.regexExtracted}개`);
  console.log(`    LLM 잔여: ${ppStats.unmatchedChars}자 (${ppStats.savedPercent}% 절감)`);
  console.log(`  Phase 2 (LLM): ${llmChunks}청크 → ${result.metadata.llmItems}개 추가`);
  console.log(`  최종 결과: ${result.categories.length}개 카테고리, ${totalItems}개 시술`);
  console.log(`  소요시간: ${totalDuration}초`);
  console.log(`  결과 파일: ${outputPath}`);
  console.log();

  // 카테고리별 상세
  for (const cat of result.categories) {
    console.log(`  📋 ${cat.name} [${cat.tag || 'none'}]: ${cat.items.length}개`);
    if (opts.verbose) {
      for (const item of cat.items.slice(0, 5)) {
        const price = item.event_price ? `${item.event_price.toLocaleString()}원` : '가격없음';
        const vol = item.volume_or_count ? ` ${item.volume_or_count}` : '';
        const area = item.area ? ` [${item.area}]` : '';
        const promo = item.promo ? ` (${item.promo})` : '';
        const purpose = item.purpose ? ` {${item.purpose}}` : '';
        const sub = item.master_sub ? ` [${item.master_sub}]` : '';
        const src = item.source ? ` <${item.source}>` : '';
        console.log(`     - ${item.treatment_name}${vol}${area}${promo}${purpose}${sub}: ${price}${src}`);
      }
      if (cat.items.length > 5) console.log(`     ... +${cat.items.length - 5}개`);
    }
  }
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e);
  process.exit(1);
});
