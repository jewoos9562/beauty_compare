#!/usr/bin/env node
/**
 * 범용 클리닉 크롤링 파이프라인
 *
 * Usage:
 *   node scripts/crawl-pipeline/index.mjs --url https://clinic.com
 *   node scripts/crawl-pipeline/index.mjs --url https://clinic.com --clinic-id vands_cheongdam --clinic-name "밴스의원 청담점" --district gangnam
 *   node scripts/crawl-pipeline/index.mjs --url https://clinic.com --dry-run    # Phase 1만
 *   node scripts/crawl-pipeline/index.mjs --url https://clinic.com --max-pages 20 --max-images 10
 */

import fs from 'fs';
import { phase1Extract } from './phase1-extract.mjs';
import { phase2Classify } from './phase2-classify.mjs';
import { log } from './utils.mjs';

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
    maxPages: parseInt(get('--max-pages') || '100', 10),
    maxImages: parseInt(get('--max-images') || '30', 10),
    output: get('--output'),
    rawInput: get('--raw-input'),  // Phase 1 스킵, 저장된 텍스트 덤프 사용
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  };
}

async function main() {
  const opts = parseArgs();

  if (!opts.url) {
    console.log(`
범용 클리닉 크롤링 파이프라인

Usage:
  node scripts/crawl-pipeline/index.mjs --url <URL> [options]

Options:
  --url <url>            클리닉 홈페이지 URL (필수)
  --clinic-id <id>       클리닉 ID (예: vands_cheongdam)
  --clinic-name <name>   클리닉 이름 (예: "밴스의원 청담점")
  --district <id>        지역 ID (기본: gangnam)
  --max-pages <n>        최대 크롤링 페이지 수 (기본: 50)
  --max-images <n>       최대 VLM 분석 이미지 수 (기본: 30)
  --output <path>        JSON 출력 경로
  --dry-run              Phase 1만 실행 (텍스트 덤프)
  --verbose              상세 로그
`);
    process.exit(1);
  }

  // API key 확인
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY 환경변수가 필요합니다');
    process.exit(1);
  }

  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  범용 크롤링 파이프라인`);
  console.log(`  URL: ${opts.url}`);
  console.log(`${'='.repeat(60)}\n`);

  // ── Phase 1: Raw Extraction ──
  let combinedText;
  let phase1Pages = 0;
  let phase1Images = 0;

  if (opts.rawInput) {
    // 저장된 텍스트 덤프 사용 (Phase 1 스킵)
    combinedText = fs.readFileSync(opts.rawInput, 'utf-8');
    log('info', `Phase 1 스킵 - 저장된 텍스트 사용: ${opts.rawInput} (${combinedText.length}자)`);
  } else {
    const phase1Result = await phase1Extract(opts.url, {
      maxPages: opts.maxPages,
      maxImages: opts.maxImages,
    });
    combinedText = phase1Result.combinedText;
    phase1Pages = phase1Result.pages.length;
    phase1Images = phase1Result.imageCount;

    // 항상 raw 텍스트 저장 (나중에 Phase 2만 재실행 가능)
    const rawPath = `./pipeline-raw-${opts.clinicId || 'output'}.txt`;
    fs.writeFileSync(rawPath, combinedText, 'utf-8');
    log('info', `Phase 1 텍스트 저장: ${rawPath}`);
  }

  // dry-run이면 여기서 종료
  if (opts.dryRun) {
    log('success', `Phase 1 완료 (${combinedText.length}자)`);
    return;
  }

  // ── Phase 2: Haiku Classification ──
  const clinicInfo = {
    id: opts.clinicId || `clinic_${Date.now()}`,
    district_id: opts.district,
    name: opts.clinicName || opts.url,
    address: '서울',
    phone: '',
    note: '',
    color: 'from-indigo-500 to-blue-400',
  };

  const result = await phase2Classify(combinedText, clinicInfo);

  // 결과 저장
  const outputPath = opts.output || `./crawl-results-pipeline-${opts.clinicId || 'output'}.json`;
  fs.writeFileSync(outputPath, JSON.stringify([result], null, 2), 'utf-8');

  // 요약 출력
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  크롤링 완료 요약`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  URL: ${opts.url}`);
  console.log(`  페이지 크롤링: ${phase1Pages}개`);
  console.log(`  이미지 분석: ${phase1Images}개`);
  console.log(`  카테고리: ${result.categories.length}개`);

  const totalItems = result.categories.reduce((sum, c) => sum + c.items.length, 0);
  console.log(`  시술 항목: ${totalItems}개`);
  console.log(`  미매핑: ${result.metadata.unmatchedCount}개`);
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
        console.log(`     - ${item.treatment_name}${vol}${area}${promo}: ${price}`);
      }
      if (cat.items.length > 5) console.log(`     ... +${cat.items.length - 5}개`);
    }
  }

  // 미매핑 항목
  if (result.metadata.unmatched.length > 0) {
    console.log(`\n  ⚠️ 미매핑 항목:`);
    for (const u of result.metadata.unmatched.slice(0, 10)) {
      console.log(`     - ${u.raw_text}: ${u.reason}`);
    }
  }
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e);
  process.exit(1);
});
