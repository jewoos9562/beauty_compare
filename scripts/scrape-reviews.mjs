/**
 * Google Maps Review Scraper using Playwright
 *
 * Usage:
 *   node scripts/scrape-reviews.mjs              # Scrape all clinics
 *   node scripts/scrape-reviews.mjs --clinic uni_kondae  # Specific clinic
 *   node scripts/scrape-reviews.mjs --seed        # Scrape + seed to Supabase
 *   node scripts/scrape-reviews.mjs --test        # Test with 3 clinics
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { readFileSync } from 'fs';
try {
  const envFile = readFileSync('.env.local', 'utf8');
  for (const line of envFile.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opvfdywolzgiqaraoyot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchClinics() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase.from('clinics').select('id, name, address');
  if (error) throw error;
  return data;
}

async function scrapeReviews(page, clinicName, clinicAddress) {
  const query = `${clinicName} ${clinicAddress}`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  console.log(`  🔍 Searching: ${query}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Sometimes Google shows a list of results — click the first one
  try {
    // Wait for either a place page or search results
    await page.waitForTimeout(2000);
    const firstResult = page.locator('a[href*="/maps/place/"]').first();
    if (await firstResult.isVisible({ timeout: 5000 })) {
      await firstResult.click();
      await page.waitForTimeout(3000);
    }
  } catch { /* already on place page */ }

  // If still on search results, try clicking the first feed item
  try {
    const feedItem = page.locator('div[role="feed"] > div').first();
    if (await feedItem.isVisible({ timeout: 2000 })) {
      await feedItem.click();
      await page.waitForTimeout(3000);
    }
  } catch { /* already on place page */ }

  // Get rating and total review count from the place page
  let avgRating = null;
  let totalReviews = null;

  try {
    // Try to get rating from the main info
    const ratingEl = page.locator('div.F7nice span[aria-hidden="true"]').first();
    if (await ratingEl.isVisible({ timeout: 5000 })) {
      const ratingText = await ratingEl.textContent();
      avgRating = parseFloat(ratingText.replace(',', '.'));
    }
  } catch { /* no rating found */ }

  try {
    // Get total review count
    const reviewCountEl = page.locator('div.F7nice span[aria-label*="리뷰"], div.F7nice span[aria-label*="review"]').first();
    if (await reviewCountEl.isVisible({ timeout: 3000 })) {
      const countText = await reviewCountEl.getAttribute('aria-label') || await reviewCountEl.textContent();
      const match = countText.match(/([\d,]+)/);
      if (match) totalReviews = parseInt(match[1].replace(/,/g, ''));
    }
  } catch { /* no count found */ }

  // Click on reviews tab — try multiple selectors
  const reviewSelectors = [
    'button[aria-label*="리뷰"]',
    'button[aria-label*="review"]',
    'button[aria-label*="Reviews"]',
    'button[jsaction*="review"]',
    'div.F7nice',                    // rating area is clickable
    'span[aria-label*="리뷰"]',
    'div.RWPxGd',                    // reviews section header
  ];
  for (const sel of reviewSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click();
        await page.waitForTimeout(2500);
        // Check if reviews appeared
        const hasReviews = await page.locator('div[data-review-id]').first().isVisible({ timeout: 2000 });
        if (hasReviews) break;
      }
    } catch { /* try next selector */ }
  }

  // Scroll to load more reviews
  const reviewPanel = page.locator('div[role="main"]').first();
  const scrollable = page.locator('div.m6QErb.DxyBCb.kA9KIf.dS8AEf').first();

  let reviews = [];
  const maxScrollAttempts = 30; // ~150 reviews max
  let previousCount = 0;
  let noNewCount = 0;

  for (let i = 0; i < maxScrollAttempts; i++) {
    // Extract current reviews
    reviews = await extractReviews(page);

    console.log(`    📜 Scroll ${i + 1}: ${reviews.length} reviews loaded`);

    if (reviews.length === previousCount) {
      noNewCount++;
      if (noNewCount >= 3) break; // No new reviews after 3 scrolls
    } else {
      noNewCount = 0;
    }
    previousCount = reviews.length;

    // Scroll down
    try {
      if (await scrollable.isVisible({ timeout: 1000 })) {
        await scrollable.evaluate(el => el.scrollBy(0, 3000));
      } else {
        await reviewPanel.evaluate(el => el.scrollBy(0, 3000));
      }
    } catch {
      await page.mouse.wheel(0, 3000);
    }
    await page.waitForTimeout(1500);
  }

  // Expand all "더보기" (More) buttons via JS (much faster than clicking each)
  try {
    await page.evaluate(() => {
      document.querySelectorAll('button.w8nwRe.kyuRq').forEach(btn => btn.click());
    });
    await page.waitForTimeout(1500);
    reviews = await extractReviews(page);
  } catch { /* no more buttons */ }

  // Extract star distribution
  const starDist = await extractStarDistribution(page, reviews);

  return {
    avgRating,
    totalReviews: totalReviews || reviews.length,
    starDistribution: starDist,
    reviews,
  };
}

async function extractReviews(page) {
  return await page.evaluate(() => {
    const reviewEls = document.querySelectorAll('div[data-review-id]');
    const results = [];

    for (const el of reviewEls) {
      try {
        // Rating
        const starEl = el.querySelector('span.kvMYJc');
        const ratingAttr = starEl?.getAttribute('aria-label') || '';
        const ratingMatch = ratingAttr.match(/(\d)/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : null;

        // Review text
        const textEl = el.querySelector('span.wiI7pd');
        const text = textEl?.textContent?.trim() || '';

        // Author
        const authorEl = el.querySelector('div.d4r55, button.WEBjve div');
        const author = authorEl?.textContent?.trim() || '';

        // Time
        const timeEl = el.querySelector('span.rsqaWe');
        const time = timeEl?.textContent?.trim() || '';

        if (text || rating) {
          results.push({ rating, text, author, time });
        }
      } catch { /* skip malformed review */ }
    }
    return results;
  });
}

async function extractStarDistribution(page, reviews) {
  // Try from page elements first
  try {
    const dist = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr.BHOKXe');
      const d = {};
      for (const row of rows) {
        const label = row.querySelector('td.yxmtmf')?.getAttribute('aria-label') ||
                      row.querySelector('td')?.getAttribute('aria-label') ||
                      row.querySelector('div.JzSRQc')?.textContent || '';
        const starMatch = label.match(/(\d)/);
        const bar = row.querySelector('div.Iv2tnb, div.shLbMe');
        const style = bar?.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*([\d.]+)%/);
        if (starMatch) {
          d[starMatch[1]] = widthMatch ? Math.round(parseFloat(widthMatch[1])) : 0;
        }
      }
      return Object.keys(d).length > 0 ? d : null;
    });
    if (dist) return dist;
  } catch { /* fallback */ }

  // Fallback: compute from collected reviews
  if (reviews.length > 0) {
    const dist = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    for (const r of reviews) {
      if (r.rating >= 1 && r.rating <= 5) dist[String(r.rating)]++;
    }
    return dist;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');
  const isTest = args.includes('--test');
  const clinicFilter = args.includes('--clinic') ? args[args.indexOf('--clinic') + 1] : null;

  console.log('=== Google Maps 리뷰 스크래핑 시작 ===\n');

  let clinics = await fetchClinics();

  if (clinicFilter) {
    clinics = clinics.filter(c => c.id === clinicFilter);
    if (clinics.length === 0) {
      console.error(`❌ 클리닉 '${clinicFilter}' 없음`);
      process.exit(1);
    }
  }
  if (isTest) {
    clinics = clinics.slice(0, 3);
  }

  console.log(`📋 ${clinics.length}개 클리닉 스크래핑\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--lang=ko-KR,ko', '--no-sandbox']
  });
  const context = await browser.newContext({
    locale: 'ko-KR',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  // Accept cookies if prompted
  const page = await context.newPage();

  const results = [];

  for (let i = 0; i < clinics.length; i++) {
    const clinic = clinics[i];
    console.log(`\n[${i + 1}/${clinics.length}] ${clinic.name}`);

    try {
      const data = await scrapeReviews(page, clinic.name, clinic.address);
      results.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        ...data,
      });
      console.log(`  ✅ ${data.avgRating}점 | ${data.reviews.length}개 리뷰 수집`);
    } catch (err) {
      console.error(`  ❌ 실패: ${err.message}`);
      results.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        avgRating: null,
        totalReviews: 0,
        starDistribution: null,
        reviews: [],
        error: err.message,
      });
    }

    // Polite delay
    if (i < clinics.length - 1) {
      const delay = 2000 + Math.random() * 3000;
      await page.waitForTimeout(delay);
    }
  }

  await browser.close();

  // Save raw results
  const outputPath = './review-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 결과 저장: ${outputPath}`);

  // Summary
  const withReviews = results.filter(r => r.reviews.length > 0);
  const totalReviews = results.reduce((s, r) => s + r.reviews.length, 0);
  console.log(`\n=== 완료 ===`);
  console.log(`${withReviews.length}/${results.length} 클리닉 성공`);
  console.log(`총 ${totalReviews}개 리뷰 수집`);

  if (shouldSeed) {
    console.log('\n🌱 Supabase 시딩은 LLM 요약 후 진행합니다');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
