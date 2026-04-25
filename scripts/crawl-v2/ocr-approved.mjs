#!/usr/bin/env node

/**
 * OCR for approved images using Claude Haiku vision
 *
 * Reads approved images from Supabase Storage, sends to Claude vision API,
 * saves extracted text to crawl_images.ocr_text
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-xxx node scripts/crawl-v2/ocr-approved.mjs
 *   ANTHROPIC_API_KEY=sk-xxx node scripts/crawl-v2/ocr-approved.mjs --clinic=메이퓨어의원
 *   ANTHROPIC_API_KEY=sk-xxx node scripts/crawl-v2/ocr-approved.mjs --redo  # redo already OCR'd
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/crawl-images/`;

const clinicFilter = process.argv.find(a => a.startsWith('--clinic='))?.split('=')[1];
const redo = process.argv.includes('--redo');

async function ocrImage(imageUrl) {
  // Download image as base64
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  const base64 = buffer.toString('base64');
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const mediaType = contentType.includes('png') ? 'image/png' : contentType.includes('webp') ? 'image/webp' : 'image/jpeg';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `한국 피부과/미용의원의 가격표 또는 이벤트 이미지입니다. 모든 텍스트를 정확히 추출하세요.

규칙:
- 취소선(줄 그어진 가격)은 ~~가격~~ 형식으로 표시 (이것이 정가/원래가)
- 취소선 없는 가격이 할인가/이벤트가
- 시술명, 용량/횟수, 가격을 | 로 구분
- 한 시술당 한 줄

예시:
보톡스 50U | ~~120,000원~~ | 59,000원
울쎄라 300샷 | ~~2,500,000원~~ | 1,490,000원
필러 1cc | 150,000원

규칙:
- 가격표가 있으면 위 형식으로
- 일반 텍스트면 그대로 줄바꿈으로
- 텍스트가 없으면: (텍스트 없음)
- 설명이나 마크다운 없이 텍스트만`,
        },
      ],
    }],
  });

  return response.content[0].text.trim();
}

async function main() {
  // Fetch approved images
  let query = supabase
    .from('crawl_images')
    .select('id, hira_id, clinic_name, storage_path')
    .eq('status', 'approved')
    .order('clinic_name');

  if (clinicFilter) query = query.eq('clinic_name', clinicFilter);
  if (!redo) query = query.is('ocr_text', null);

  const { data: images, error } = await query;
  if (error) { console.error('DB error:', error.message); process.exit(1); }
  if (!images || images.length === 0) {
    console.log('OCR 대상 없음.' + (clinicFilter ? ` (${clinicFilter})` : '') + (!redo ? ' --redo로 재실행 가능.' : ''));
    return;
  }

  // Group by clinic
  const byClinic = new Map();
  for (const img of images) {
    if (!byClinic.has(img.clinic_name)) byClinic.set(img.clinic_name, []);
    byClinic.get(img.clinic_name).push(img);
  }

  console.log(`\n=== OCR 시작 (Claude Haiku Vision) ===`);
  console.log(`=== ${images.length}개 이미지, ${byClinic.size}개 클리닉 ===\n`);

  let done = 0, failed = 0, dupeSkip = 0;
  const t0 = Date.now();

  for (const [clinicName, clinicImages] of byClinic) {
    console.log(`[${clinicName}] ${clinicImages.length}개`);

    // Hash-based dedup within clinic: download all, hash, skip identical
    const hashMap = new Map(); // hash → ocr_text (reuse result for dupes)
    const imgBuffers = new Map(); // id → { buffer, hash, imageUrl }

    for (const img of clinicImages) {
      try {
        const resp = await fetch(STORAGE_URL + img.storage_path);
        const buffer = Buffer.from(await resp.arrayBuffer());
        const hash = (await import('crypto')).createHash('md5').update(buffer).digest('hex');
        imgBuffers.set(img.id, { buffer, hash, imageUrl: STORAGE_URL + img.storage_path });
      } catch {
        imgBuffers.set(img.id, null);
      }
    }

    for (let i = 0; i < clinicImages.length; i++) {
      const img = clinicImages[i];
      const bufInfo = imgBuffers.get(img.id);

      if (!bufInfo) {
        process.stdout.write(`  ${i + 1}/${clinicImages.length} ✗ download failed\n`);
        failed++;
        continue;
      }

      // If same hash already OCR'd, reuse
      if (hashMap.has(bufInfo.hash)) {
        const existingText = hashMap.get(bufInfo.hash);
        await supabase.from('crawl_images')
          .update({ ocr_text: existingText, ocr_status: 'done' })
          .eq('id', img.id);
        dupeSkip++;
        process.stdout.write(`  ${i + 1}/${clinicImages.length} ↩ 중복 (해시 재사용)\n`);
        continue;
      }

      try {
        const text = await ocrImage(bufInfo.imageUrl);

        await supabase.from('crawl_images')
          .update({ ocr_text: text, ocr_status: 'done' })
          .eq('id', img.id);

        hashMap.set(bufInfo.hash, text);
        const preview = text.slice(0, 50).replace(/\n/g, ' ');
        process.stdout.write(`  ${i + 1}/${clinicImages.length} ✓ ${preview}...\n`);
        done++;
      } catch (e) {
        process.stdout.write(`  ${i + 1}/${clinicImages.length} ✗ ${e.message?.slice(0, 40)}\n`);
        failed++;
      }

      await new Promise(r => setTimeout(r, 500));
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n=== 완료: ${done}개 성공, ${dupeSkip}개 중복스킵, ${failed}개 실패, ${elapsed}초 ===\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
