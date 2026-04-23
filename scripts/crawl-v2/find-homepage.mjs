#!/usr/bin/env node

/**
 * 비공식 링크(블로그/카카오/인스타)인 클리닉의 공식 홈페이지를 Google 검색으로 찾기
 *
 * Usage:
 *   node find-homepage.mjs --gu=광진구          # 광진구만
 *   node find-homepage.mjs --gu=광진구 --apply  # 찾은 결과를 seoul_derma.json에 반영
 *   node find-homepage.mjs --dry-run            # 전체 비공식 링크 목록만 출력
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, '../../public/data/seoul_derma.json');

const NON_OFFICIAL = [
  'blog.naver.com',
  'pf.kakao.com',
  'instagram.com',
  'blog.kakao.com',
  'place.naver.com',
  'naver.me',
  'facebook.com',
  'youtube.com',
  'linktr.ee',
];

const SKIP_DOMAINS = [
  ...NON_OFFICIAL,
  'google.com', 'naver.com', 'daum.net', 'kakao.com',
  'youtube.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'tiktok.com', 'linkedin.com',
  'modoo.at',
  // 3자 병원정보/검색 사이트
  'modoodoc.com', 'goodoc.co.kr', 'e-gen.or.kr', 'pervsi.com',
  'occupationalhealthblog.net', 'ttpk.co.kr', 'weseb.com',
  'ayo.pe.kr', 'cashdoc.me', 'jemoday.com', 'hira.or.kr',
  'booking.naver.com', 'map.naver.com', 'map.kakao.com',
  'duckduckgo.com',
  'easysearch.kr', 'yugacrew.com', 'wizdoctor.com',
  'hidoc.co.kr', 'vicharas.net', 'modoohospital.com',
  'mediup.co.kr', 'ddocdoc.com', 'yeogi.me',
  'hospital.vicharas.net', 'mobile.hidoc.co.kr',
  'saeob.com', 'hancome.kr', 'cbuy.kr', 'miclick.co.kr',
  'daangn.com', 'tistory.com', 'wikipedia.org',
  'namu.wiki', 'khealth.or.kr', 'kmcric.com',
  'ilsangkit.co.kr', 'purpleo.co.kr', 'hdr.purpleo.co.kr',
];

function isNonOfficial(url) {
  try {
    const host = new URL(url).hostname;
    return NON_OFFICIAL.some(d => host.includes(d));
  } catch { return false; }
}

function isSkipDomain(url) {
  try {
    const host = new URL(url).hostname;
    return SKIP_DOMAINS.some(d => host.includes(d));
  } catch { return true; }
}

async function searchDDG(page, clinicName, gu) {
  const query = `${clinicName} ${gu} 공식 홈페이지`;
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    const links = await page.evaluate((skipList) => {
      const results = [];
      for (const a of document.querySelectorAll('a[href]')) {
        const href = a.href;
        if (!href.startsWith('http') || href.includes('duckduckgo')) continue;
        try {
          const host = new URL(href).hostname;
          const skip = skipList.some(d => host.includes(d));
          if (skip) continue;
          if (host.includes('.co.kr') || host.includes('.com') || host.includes('.kr') || host.includes('.net')) {
            results.push(href);
          }
        } catch {}
      }
      return [...new Set(results)].slice(0, 5);
    }, SKIP_DOMAINS);

    return links;
  } catch {
    return [];
  }
}

async function verifyHomepage(page, url, clinicName) {
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
    if (!resp || !resp.ok()) return false;

    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
    // Check if the page mentions the clinic name or common medical terms
    const nameMatch = clinicName.replace(/의원|피부과|클리닉/g, '').trim();
    const hasClinicRef = text.includes(nameMatch) ||
      text.includes('시술') || text.includes('가격') ||
      text.includes('이벤트') || text.includes('진료');
    return hasClinicRef && text.length > 200;
  } catch {
    return false;
  }
}

async function main() {
  const guArg = process.argv.find(a => a.startsWith('--gu='))?.split('=')[1];
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry-run');

  const allClinics = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

  let targets = allClinics.filter(c => c.homepage && isNonOfficial(c.homepage));
  if (guArg) targets = targets.filter(c => c.gu === guArg);

  if (dryRun) {
    console.log(`\n비공식 링크 클리닉: ${targets.length}개\n`);
    for (const c of targets) {
      console.log(`  ${c.gu} | ${c.name} | ${c.homepage}`);
    }
    return;
  }

  console.log(`\n=== 공식 홈페이지 검색 ===`);
  console.log(`=== ${guArg || '전체'}: ${targets.length}개 대상 ===\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const results = [];

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${c.name} `);

    const candidates = await searchDDG(page, c.name, c.gu);

    let found = null;
    for (const url of candidates) {
      const valid = await verifyHomepage(page, url, c.name);
      if (valid) {
        found = url;
        break;
      }
    }

    if (found) {
      console.log(`→ ${found}`);
      results.push({ id: c.id, name: c.name, gu: c.gu, old: c.homepage, new: found });
    } else {
      console.log(`→ 못 찾음 (후보: ${candidates.length}개)`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  console.log(`\n=== 결과: ${results.length}/${targets.length}개 발견 ===\n`);
  for (const r of results) {
    console.log(`  ${r.name} (${r.gu})`);
    console.log(`    기존: ${r.old}`);
    console.log(`    신규: ${r.new}\n`);
  }

  if (apply) {
    // Found official → update homepage
    for (const r of results) {
      const clinic = allClinics.find(c => c.id === r.id);
      if (clinic) {
        clinic.homepage_original = clinic.homepage;
        clinic.homepage = r.new;
        clinic.homepage_status = 'official';
      }
    }

    // Not found → mark as no official site
    const foundIds = new Set(results.map(r => r.id));
    const notFound = targets.filter(c => !foundIds.has(c.id));
    for (const c of notFound) {
      const clinic = allClinics.find(a => a.id === c.id);
      if (clinic) {
        clinic.homepage_status = 'no_official';
      }
    }

    fs.writeFileSync(JSON_PATH, JSON.stringify(allClinics, null, 2), 'utf8');
    console.log(`\nseoul_derma.json 업데이트:`);
    console.log(`  공식 홈페이지 발견: ${results.length}개 (homepage 교체)`);
    console.log(`  공식 사이트 없음: ${notFound.length}개 (homepage_status = no_official)`);
  } else {
    console.log('--apply 플래그로 실행하면 seoul_derma.json에 반영됩니다.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
