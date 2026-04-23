#!/usr/bin/env node

/**
 * OCR 스크립트
 *
 * Admin에서 ocr_status='ocr_yes'로 마킹된 이미지 대상
 * Tesseract.js��� OCR → ocr_text 컬럼에 저장
 * ocr_status를 'done'으로 업데이트
 *
 * 사용: node scripts/crawl-v2/ocr.mjs [--hira=HIRA_ID]
 * 비용: 0원 (로컬 OCR)
 */

import { createWorker } from 'tesseract.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/crawl-images/`;

async function main() {
  const hiraFilter = process.argv.find(a => a.startsWith('--hira='))?.split('=')[1];

  // Fetch images marked for OCR
  let query = supabase
    .from('crawl_images')
    .select('id, hira_id, clinic_name, storage_path')
    .eq('ocr_status', 'ocr_yes');

  if (hiraFilter) {
    query = query.eq('hira_id', hiraFilter);
  }

  const { data: images, error } = await query;
  if (error) {
    console.error('DB error:', error.message);
    process.exit(1);
  }

  if (!images || images.length === 0) {
    console.log('OCR 대상 이미지가 없습니다. Admin에서 Y키로 마킹해주세요.');
    return;
  }

  console.log(`\n=== OCR 시작: ${images.length}개 이미지 ===\n`);

  const worker = await createWorker('kor+eng');

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imageUrl = STORAGE_URL + img.storage_path;

    console.log(`  [${i + 1}/${images.length}] ${img.clinic_name} — ${img.storage_path.split('/').pop()}`);

    try {
      const { data: { text } } = await worker.recognize(imageUrl);
      const cleaned = text.trim();

      if (cleaned.length < 10) {
        console.log(`    → 텍스트 너무 짧음 (${cleaned.length}자), 스킵`);
        await supabase.from('crawl_images').update({ ocr_status: 'done', ocr_text: null }).eq('id', img.id);
        continue;
      }

      await supabase.from('crawl_images').update({
        ocr_status: 'done',
        ocr_text: cleaned,
      }).eq('id', img.id);

      console.log(`    → ${cleaned.length}자 추출 완료`);
    } catch (e) {
      console.log(`    → OCR 실패: ${e.message?.slice(0, 60)}`);
      await supabase.from('crawl_images').update({ ocr_status: 'ocr_error' }).eq('id', img.id);
    }
  }

  await worker.terminate();
  console.log('\n=== OCR 완료 ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
