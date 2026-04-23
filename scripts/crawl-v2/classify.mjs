#!/usr/bin/env node

/**
 * 분류 스크립트
 *
 * crawl_pages의 raw_text + crawl_images의 ocr_text를 병합하여
 * Claude API로 시술/가격 파싱 → crawl_treatments에 저장
 *
 * 사용:
 *   node scripts/crawl-v2/classify.mjs                    # 모든 클리닉
 *   node scripts/crawl-v2/classify.mjs --hira=HIRA_ID     # 특정 클리닉만
 *   node scripts/crawl-v2/classify.mjs --dry-run           # API 호출 없이 병합 텍스트 확인
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const masterTreatments = JSON.parse(fs.readFileSync(path.join(__dirname, 'master-treatments.json'), 'utf8'));

// --- ENV ---
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dryRun = process.argv.includes('--dry-run');
const hiraFilter = process.argv.find(a => a.startsWith('--hira='))?.split('=')[1];

// --- Gather merged text for a clinic ---
async function getMergedText(hiraId) {
  // 1. raw_text from crawl_pages
  const { data: pages } = await supabase
    .from('crawl_pages')
    .select('url, raw_text')
    .eq('hira_id', hiraId)
    .order('id');

  const pageTexts = (pages || []).map((p, i) =>
    `=== 페이지 ${i + 1}: ${p.url} ===\n${p.raw_text}`
  ).join('\n\n');

  // 2. ocr_text from crawl_images (only done OCR)
  const { data: ocrImages } = await supabase
    .from('crawl_images')
    .select('source_url, ocr_text')
    .eq('hira_id', hiraId)
    .eq('ocr_status', 'done')
    .not('ocr_text', 'is', null);

  const ocrTexts = (ocrImages || []).map((img, i) =>
    `=== OCR 이미지 ${i + 1} (${img.source_url}) ===\n${img.ocr_text}`
  ).join('\n\n');

  return { pageTexts, ocrTexts, pageCount: pages?.length || 0, ocrCount: ocrImages?.length || 0 };
}

// --- Parse with Claude ---
async function parseTreatments(clinicName, pageTexts, ocrTexts) {
  const masterSummary = masterTreatments.map(t =>
    `${t.category} > ${t.subcategory} > ${t.name_ko} (${t.standard_name}) [${t.unit}] 키워드: ${t.keywords}`
  ).join('\n');

  let mergedText = pageTexts;
  if (ocrTexts) {
    mergedText += '\n\n## OCR로 추출한 이미지 텍스트 (가격표 등)\n' + ocrTexts;
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `당신은 한국 피부과/미용의원의 웹사이트에서 시술 가격 정보를 추출하는 전문가입니다.

## 마스터 시술 데이터 (참고용 — 시술 분류에 사용)
${masterSummary}

## 병원: ${clinicName}

## 크롤링된 텍스트
${mergedText}

## 작업
위 텍스트에서 시술명과 가격 정보를 추출하세요.

## 출력 형식 (JSON array만, 다른 텍스트 없이)
\`\`\`json
[
  {
    "treatment_name": "시술명 (원본 그대로)",
    "category": "마스터 데이터 기준 카테고리 (필러/보톡스/리프팅/피부/바디/제모/기타)",
    "subcategory": "마스터 데이터 기준 서브카테고리",
    "standard_name": "마스터 데이터에 매칭���는 표준 시술명 (없으면 null)",
    "orig_price": 정가(숫자, 없으면 null),
    "event_price": 이벤트/할인가(숫자, 없으면 null),
    "volume_or_count": "용량/횟수 (예: 1cc, 100U, 300샷, 1회)",
    "area": "시술 부위 (예: 얼굴, 턱, 이마)",
    "notes": "브랜드/추가 정보",
    "source_url": "해당 정보가 있던 페이지 URL"
  }
]
\`\`\`

## 규칙
- 가격이 명확하지 않은 항목(가격문의, 상담 후 결정)은 orig_price와 event_price를 null로
- 가격 단위: 원 (10,000원 → 10000)
- "~" 등 범위가 있으면 낮은 가격을 event_price에
- 텍스트에서 가격 정보가 전혀 없으면 빈 배열 []
- 중복 제거: 같은 시술+같은 가격은 하나만
- JSON만 출력하세요. 설명이나 마크다운 없이.`
    }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.log('  [warn] No JSON found in Claude response');
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log('  [warn] JSON parse error:', e.message);
    return [];
  }
}

// --- Save to DB ---
async function saveTreatments(hiraId, clinicName, treatments) {
  if (treatments.length === 0) return 0;

  // Clear previous classification for this clinic
  await supabase.from('crawl_treatments').delete().eq('hira_id', hiraId);

  const rows = treatments.map(t => ({
    hira_id: hiraId,
    clinic_name: clinicName,
    category: t.category || null,
    subcategory: t.subcategory || null,
    treatment_name: t.treatment_name,
    standard_name: t.standard_name || null,
    orig_price: t.orig_price || null,
    event_price: t.event_price || null,
    volume_or_count: t.volume_or_count || null,
    area: t.area || null,
    notes: t.notes || null,
    source_url: t.source_url || null,
  }));

  const { error } = await supabase.from('crawl_treatments').insert(rows);
  if (error) {
    console.error('  [db error]', error.message);
    return 0;
  }
  return rows.length;
}

// --- MAIN ---
async function main() {
  // Get unique clinic IDs from crawl_pages
  const { data: clinicRows } = await supabase
    .from('crawl_pages')
    .select('hira_id, clinic_name')
    .order('hira_id');

  if (!clinicRows || clinicRows.length === 0) {
    console.log('crawl_pages에 데이터가 없습니다. ���저 crawl.mjs를 실행해주세요.');
    return;
  }

  // Deduplicate
  const clinicMap = new Map();
  for (const row of clinicRows) {
    if (!clinicMap.has(row.hira_id)) {
      clinicMap.set(row.hira_id, row.clinic_name);
    }
  }

  let clinics = [...clinicMap.entries()]; // [hiraId, clinicName]
  if (hiraFilter) {
    clinics = clinics.filter(([id]) => id === hiraFilter);
  }

  console.log(`\n=== 시술 분류 시작: ${clinics.length}개 클리닉 ===`);
  if (dryRun) console.log('  (dry-run 모드 — API 호출 없음)\n');

  for (const [hiraId, clinicName] of clinics) {
    console.log(`\n[${clinicName}]`);

    const { pageTexts, ocrTexts, pageCount, ocrCount } = await getMergedText(hiraId);
    console.log(`  → raw_text: ${pageCount}개 페이지, OCR: ${ocrCount}개 이미지`);

    if (!pageTexts && !ocrTexts) {
      console.log('  → 텍스트 없음, 스킵');
      continue;
    }

    if (dryRun) {
      const totalLen = (pageTexts?.length || 0) + (ocrTexts?.length || 0);
      console.log(`  → 병합 텍스트: ${totalLen}자`);
      continue;
    }

    console.log('  → Claude API 분류 중...');
    const treatments = await parseTreatments(clinicName, pageTexts, ocrTexts);
    console.log(`  → ${treatments.length}개 시술 추출`);

    const saved = await saveTreatments(hiraId, clinicName, treatments);
    console.log(`  → ${saved}건 DB 저장 완료`);
  }

  console.log('\n=== 분류 완료 ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
