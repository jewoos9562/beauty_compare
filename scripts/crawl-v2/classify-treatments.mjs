#!/usr/bin/env node

/**
 * 시술 분류 스크립트
 *
 * crawl_pages raw_text + crawl_images ocr_text → Claude Sonnet → classified_treatments
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-xxx node scripts/crawl-v2/classify-treatments.mjs --gu=광진구
 *   ANTHROPIC_API_KEY=sk-xxx node scripts/crawl-v2/classify-treatments.mjs --clinic=건대닥터에버스의원
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const clinicFilter = process.argv.find(a => a.startsWith('--clinic='))?.split('=')[1];
const guFilter = process.argv.find(a => a.startsWith('--gu='))?.split('=')[1];

// --- Load taxonomy ---
const XLSX = (await import('xlsx')).default;
const wb = XLSX.readFile(path.join(__dirname, '../../beauty_compare_taxonomy.xlsx'));

const masterSheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], { header: 1 });
const masterRows = masterSheet.filter(r => r && r[0] && r[0] !== 'Beauty Compare' && r[0] !== '대분류')
  .map(r => `${r[0]} | ${r[1]} | ${r[4] || ''}`).join('\n');

const keywordSheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[2]], { header: 1 });
const keywordRows = keywordSheet.filter(r => r && r[0] && r[0] !== 'Beauty Compare' && r[0] !== '표준명 (EN)')
  .map(r => `${r[0]}: 장비[${r[1] || ''}] 키워드[${r[2] || ''}] 마케팅명[${r[3] || ''}]`).join('\n');

const SYSTEM_PROMPT = `당신은 한국 피부과/미용의원의 시술 가격 정보를 정리하는 전문가입니다.

## 시술 표준명 마스터 리스트
대분류 | 표준명 (KO) | 브랜드·장비명
${masterRows}

## 매핑 키워드 (마케팅명 → 표준명)
${keywordRows}

## 출력 형식 (JSON array만, 다른 텍스트 없이)
[
  {
    "대분류": "마스터 리스트 기준 대분류",
    "표준명": "마스터 리스트 기준 표준명 (매칭 안 되면 null)",
    "브랜드_장비": "울쎄라, 슈링크유니버스 등 (없으면 null)",
    "시술_옵션": "600샷, 1cc, 50U, 10회 등 옵션 (없으면 null)",
    "부위": "풀페이스, 턱, 이마, 겨드랑이 등 (없으면 null)",
    "정가": 숫자 (원 단위, 없으면 null),
    "할인가": 숫자 (원 단위, 없으면 null),
    "비고": "첫방문, 이벤트 기간, 아이팁 포함 등"
  }
]

## 규칙
- ~~취소선 가격~~ = 정가, 취소선 없는 가격 = 할인가
- 가격 변환: "만" = ×10000, "천" = ×1000 (예: 15만9천원 → 159000, 1.5만 → 15000)
- 같은 브랜드/장비의 다른 옵션(샷수/용량/횟수)은 각각 별도 행
- 가격 정보 없는 시술도 포함 (정가/할인가 null)
- 중복 제거: 같은 시술+같은 옵션+같은 가격은 하나만
- 패키지/세트 시술은 비고에 "세트" 표시
- JSON만 출력. 설명이나 마크다운 없이.`;

// --- Gather data for a clinic ---
async function getClinicData(hiraId) {
  // raw_text
  const { data: pages } = await supabase
    .from('crawl_pages').select('url, raw_text')
    .eq('hira_id', hiraId).order('id');

  const rawTexts = (pages || []).map(p => p.raw_text).join('\n\n');

  // ocr_text from approved images — as array for batching
  const { data: ocrImages } = await supabase
    .from('crawl_images').select('ocr_text')
    .eq('hira_id', hiraId).eq('status', 'approved')
    .not('ocr_text', 'is', null);

  const ocrTextList = (ocrImages || []).map(img => img.ocr_text).filter(Boolean);

  return { rawTexts, ocrTextList, pageCount: pages?.length || 0, ocrCount: ocrTextList.length };
}

// --- Call API and parse JSON ---
async function callAPI(clinicName, textContent) {
  const userContent = `## 병원: ${clinicName}\n\n${textContent}\n\n위 텍스트에서 모든 시술 가격 정보를 추출하여 JSON array로 출력하세요.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  let text = response.content[0].text;
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) { return []; }

  try { return JSON.parse(jsonMatch[0]); }
  catch { return []; }
}

// --- Classify: batch OCR texts + raw text separately ---
async function classifyClinic(clinicName, rawTexts, ocrTextList) {
  const allResults = [];
  const BATCH_SIZE = 5;

  // 1. Process OCR texts in batches of 5
  if (ocrTextList.length > 0) {
    for (let i = 0; i < ocrTextList.length; i += BATCH_SIZE) {
      const batch = ocrTextList.slice(i, i + BATCH_SIZE);
      const content = `## 이미지 OCR 텍스트 (가격표)\n${batch.join('\n\n---\n\n')}`;
      const results = await callAPI(clinicName, content);
      allResults.push(...results);
      if (results.length > 0) process.stdout.write(`(ocr${i+1}-${i+batch.length}:${results.length}) `);
    }
  }

  // 2. Process raw text price lines
  if (rawTexts) {
    const priceKeywords = /\d+[,.]?\d*\s*(원|만|천)|가격|할인|이벤트|정가|특가|세일|균일가|\d+샷|\d+cc|\d+U|\d+회|\d+줄/;
    const lines = rawTexts.split('\n');
    const priceLines = [...new Set(lines.filter(l => priceKeywords.test(l) && l.length < 200))];
    if (priceLines.length > 0) {
      const content = `## 크롤 텍스트 (가격 관련)\n${priceLines.join('\n').slice(0, 10000)}`;
      const results = await callAPI(clinicName, content);
      allResults.push(...results);
      if (results.length > 0) process.stdout.write(`(raw:${results.length}) `);
    }
  }

  // 3. Deduplicate: same 브랜드+옵션+할인가
  const seen = new Set();
  return allResults.filter(t => {
    const key = `${t.브랜드_장비}|${t.시술_옵션}|${t.할인가}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Save ---
async function saveTreatments(hiraId, clinicName, treatments) {
  if (treatments.length === 0) return 0;

  // Clear previous
  await supabase.from('classified_treatments').delete().eq('hira_id', hiraId);

  const rows = treatments.map(t => ({
    hira_id: hiraId,
    clinic_name: clinicName,
    대분류: t.대분류 || null,
    표준명: t.표준명 || null,
    브랜드_장비: t.브랜드_장비 || null,
    시술_옵션: t.시술_옵션 || null,
    부위: t.부위 || null,
    정가: t.정가 || null,
    할인가: t.할인가 || null,
    비고: t.비고 || null,
  }));

  const { error } = await supabase.from('classified_treatments').insert(rows);
  if (error) { console.error('  [db error]', error.message); return 0; }
  return rows.length;
}

// --- Main ---
async function main() {
  // Get clinic list
  const allClinics = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/seoul_derma.json'), 'utf8'));
  const guMap = {};
  for (const c of allClinics) { if (c.id) guMap[c.id] = c.gu; }

  // Get clinics that have crawl data
  const { data: crawledPages } = await supabase.from('crawl_pages').select('hira_id, clinic_name');
  if (!crawledPages || crawledPages.length === 0) { console.log('크롤 데이터 없음'); return; }

  const clinicMap = new Map();
  for (const p of crawledPages) {
    if (!clinicMap.has(p.hira_id)) clinicMap.set(p.hira_id, p.clinic_name);
  }

  let clinics = [...clinicMap.entries()]; // [hiraId, clinicName]
  if (clinicFilter) clinics = clinics.filter(([_, name]) => name === clinicFilter);
  if (guFilter) clinics = clinics.filter(([id]) => guMap[id] === guFilter);

  console.log(`\n=== 시술 분류 (Claude Sonnet) ===`);
  console.log(`=== ${clinics.length}개 클리닉 ===\n`);

  let totalTreatments = 0;
  const t0 = Date.now();

  for (let i = 0; i < clinics.length; i++) {
    const [hiraId, clinicName] = clinics[i];
    process.stdout.write(`[${i + 1}/${clinics.length}] ${clinicName} `);

    try {
      const { rawTexts, ocrTextList, pageCount, ocrCount } = await getClinicData(hiraId);

      if (!rawTexts && ocrTextList.length === 0) {
        console.log('→ 데이터 없음');
        continue;
      }

      const treatments = await classifyClinic(clinicName, rawTexts, ocrTextList);
      const saved = await saveTreatments(hiraId, clinicName, treatments);
      totalTreatments += saved;

      console.log(`→ ${saved}개 시술 (${pageCount}p + ${ocrCount}ocr)`);
    } catch (e) {
      console.log(`→ ERROR: ${e.message?.slice(0, 50)}`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n=== 완료: ${totalTreatments}개 시술, ${elapsed}초 ===\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
