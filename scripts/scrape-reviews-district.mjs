/**
 * Scrape Google Maps reviews + Places API ratings + Claude Sonnet summary
 *
 * Usage:
 *   node scripts/scrape-reviews-district.mjs gangnam
 *   node scripts/scrape-reviews-district.mjs gangnam --seed
 *   node scripts/scrape-reviews-district.mjs all
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';

// Load env
try {
  const envFile = readFileSync('.env.local', 'utf8');
  for (const line of envFile.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!ANTHROPIC_KEY) { console.error('❌ ANTHROPIC_API_KEY 필요'); process.exit(1); }
if (!PLACES_KEY) { console.error('❌ GOOGLE_PLACES_API_KEY 필요'); process.exit(1); }

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Google Places API ───

async function getPlacesData(clinicName, clinicAddress) {
  const query = `${clinicName} ${clinicAddress}`;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.reviews',
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'ko' }),
    });
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      placeId: place.id,
      rating: place.rating ?? null,
      totalReviews: place.userRatingCount ?? 0,
      // Places API gives up to 5 reviews with individual ratings
      apiReviews: (place.reviews || []).map(r => ({
        rating: r.rating,
        text: r.originalText?.text || r.text?.text || '',
        time: r.relativePublishTimeDescription || '',
      })),
    };
  } catch (err) {
    console.error(`    ⚠️ Places API 실패: ${err.message}`);
    return null;
  }
}

// ─── Playwright Scraping ───

async function scrapeReviews(page, clinicName, clinicAddress) {
  const query = `${clinicName} ${clinicAddress}`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click first result
  try {
    await page.waitForTimeout(2000);
    const firstResult = page.locator('a[href*="/maps/place/"]').first();
    if (await firstResult.isVisible({ timeout: 5000 })) {
      await firstResult.click();
      await page.waitForTimeout(3000);
    }
  } catch {}
  try {
    const feedItem = page.locator('div[role="feed"] > div').first();
    if (await feedItem.isVisible({ timeout: 2000 })) {
      await feedItem.click();
      await page.waitForTimeout(3000);
    }
  } catch {}

  // Open reviews tab
  const reviewSelectors = [
    'button[aria-label*="리뷰"]', 'button[aria-label*="review"]',
    'button[aria-label*="Reviews"]', 'div.F7nice', 'span[aria-label*="리뷰"]',
  ];
  for (const sel of reviewSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click();
        await page.waitForTimeout(2500);
        if (await page.locator('div[data-review-id]').first().isVisible({ timeout: 2000 })) break;
      }
    } catch {}
  }

  // Scroll to load reviews
  const scrollable = page.locator('div.m6QErb.DxyBCb.kA9KIf.dS8AEf').first();
  const reviewPanel = page.locator('div[role="main"]').first();
  let reviews = [];
  let previousCount = 0, noNewCount = 0;

  for (let i = 0; i < 30; i++) {
    reviews = await extractReviews(page);
    if (i % 5 === 0 || reviews.length !== previousCount)
      console.log(`    📜 Scroll ${i + 1}: ${reviews.length} reviews`);
    if (reviews.length === previousCount) { noNewCount++; if (noNewCount >= 3) break; }
    else noNewCount = 0;
    previousCount = reviews.length;
    try {
      if (await scrollable.isVisible({ timeout: 1000 })) await scrollable.evaluate(el => el.scrollBy(0, 3000));
      else await reviewPanel.evaluate(el => el.scrollBy(0, 3000));
    } catch { await page.mouse.wheel(0, 3000); }
    await page.waitForTimeout(1500);
  }

  // Expand "더보기"
  try {
    await page.evaluate(() => document.querySelectorAll('button.w8nwRe.kyuRq').forEach(b => b.click()));
    await page.waitForTimeout(1500);
    reviews = await extractReviews(page);
  } catch {}

  return reviews;
}

async function extractReviews(page) {
  return page.evaluate(() => {
    const els = document.querySelectorAll('div[data-review-id]');
    return [...els].map(el => {
      try {
        const starEl = el.querySelector('span.kvMYJc');
        const m = (starEl?.getAttribute('aria-label') || '').match(/(\d)/);
        const rating = m ? parseInt(m[1]) : null;
        const text = el.querySelector('span.wiI7pd')?.textContent?.trim() || '';
        const time = el.querySelector('span.rsqaWe')?.textContent?.trim() || '';
        return { rating, text, time };
      } catch { return null; }
    }).filter(Boolean);
  });
}

// ─── LLM Summary ───

async function summarizeReviews(clinicName, reviews, avgRating) {
  if (reviews.length === 0) return null;

  const reviewTexts = reviews
    .filter(r => r.text && r.text.length > 10)
    .slice(0, 100)
    .map(r => `[${r.rating}★] ${r.text}`)
    .join('\n\n');

  const prompt = `다음은 "${clinicName}" 피부과/성형외과의 구글 리뷰 ${reviews.length}개입니다. 평균 별점은 ${avgRating}점입니다.

아래 리뷰들을 분석해서 JSON 형식으로 요약해주세요:

${reviewTexts}

---
다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "summary": "2-3문장으로 된 전체적인 요약",
  "pros": ["장점1", "장점2", "장점3"],
  "cons": ["단점1", "단점2"],
  "keywords": ["특징 키워드1", "키워드2", "키워드3"],
  "bestFor": "이런 사람에게 추천"
}

주의: 한국어로 작성. 장점 3-5개, 단점 1-3개, 키워드 3-5개, bestFor 1문장.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (err) {
    console.error(`    ❌ LLM 요약 실패: ${err.message}`);
    return null;
  }
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  const district = args.find(a => !a.startsWith('--')) || 'gangnam';
  const shouldSeed = args.includes('--seed');

  console.log(`=== ${district} 리뷰 스크래핑 (Places API + Playwright + Sonnet) ===\n`);

  // Get clinics
  let query = supabase.from('clinics').select('id, name, address, district_id');
  if (district !== 'all') query = query.eq('district_id', district);
  const { data: clinics } = await query;

  if (!clinics?.length) { console.error('❌ 클리닉 없음'); process.exit(1); }
  console.log(`📋 ${clinics.length}개 클리닉\n`);

  const browser = await chromium.launch({ headless: true, args: ['--lang=ko-KR,ko', '--no-sandbox'] });
  const context = await browser.newContext({
    locale: 'ko-KR',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const results = [];

  for (let i = 0; i < clinics.length; i++) {
    const clinic = clinics[i];
    console.log(`\n[${i + 1}/${clinics.length}] ${clinic.name}`);

    try {
      // Step 1: Places API — accurate rating + total count
      console.log(`  📡 Places API...`);
      const placesData = await getPlacesData(clinic.name, clinic.address);
      const rating = placesData?.rating ?? null;
      const totalReviews = placesData?.totalReviews ?? 0;
      console.log(`  ⭐ ${rating}점 (${totalReviews}개 리뷰)`);

      // Step 2: Playwright — full review texts + star distribution
      console.log(`  🌐 Playwright 스크래핑...`);
      const scrapedReviews = await scrapeReviews(page, clinic.name, clinic.address);
      console.log(`  📄 ${scrapedReviews.length}개 리뷰 텍스트 수집`);

      // Compute star distribution from scraped reviews
      const stars = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
      for (const r of scrapedReviews) {
        if (r.rating >= 1 && r.rating <= 5) stars[String(r.rating)]++;
      }

      // Step 3: Claude Sonnet summary
      let summary = null;
      if (scrapedReviews.length > 0) {
        console.log(`  🤖 Claude Sonnet 요약...`);
        summary = await summarizeReviews(clinic.name, scrapedReviews, rating);
        if (summary) {
          console.log(`  ✅ 장점: ${summary.pros?.join(', ')}`);
          console.log(`     단점: ${summary.cons?.join(', ')}`);
        }
      } else if (placesData?.apiReviews?.length > 0) {
        // Fallback: use Places API reviews for summary
        console.log(`  🤖 Places API 리뷰로 요약...`);
        summary = await summarizeReviews(clinic.name, placesData.apiReviews, rating);
      }

      results.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        rating,
        totalReviews,
        starDistribution: stars,
        reviewsScraped: scrapedReviews.length,
        summary,
      });
    } catch (err) {
      console.error(`  ❌ 실패: ${err.message}`);
      results.push({ clinicId: clinic.id, clinicName: clinic.name, rating: null, totalReviews: 0, starDistribution: null, reviewsScraped: 0, summary: null, error: err.message });
    }

    if (i < clinics.length - 1) await page.waitForTimeout(2000 + Math.random() * 2000);
  }

  await browser.close();

  // Save and update reviews.json
  const outputPath = `./review-results-${district}.json`;
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Raw 결과: ${outputPath}`);

  // Merge into src/data/reviews.json
  let existing = {};
  try { existing = JSON.parse(readFileSync('./src/data/reviews.json', 'utf8')); } catch {}

  for (const r of results) {
    if (r.rating || r.summary) {
      existing[r.clinicId] = {
        rating: r.rating,
        total: r.totalReviews,
        stars: r.starDistribution,
        ...(r.summary || {}),
      };
    }
  }
  writeFileSync('./src/data/reviews.json', JSON.stringify(existing, null, 2));
  console.log(`📦 src/data/reviews.json 업데이트 (${Object.keys(existing).length}개 클리닉)`);

  // Summary
  const ok = results.filter(r => r.rating || r.summary);
  console.log(`\n=== 완료: ${ok.length}/${results.length} 성공 ===`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
