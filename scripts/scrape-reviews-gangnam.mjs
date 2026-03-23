/**
 * Gangnam district: Scrape Google Maps reviews + Claude Sonnet summary
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-xxx node scripts/scrape-reviews-gangnam.mjs
 *   ANTHROPIC_API_KEY=sk-xxx node scripts/scrape-reviews-gangnam.mjs --seed
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
} catch { /* no .env.local */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY 환경변수가 필요합니다');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Scraping ───

async function scrapeReviews(page, clinicName, clinicAddress) {
  const query = `${clinicName} ${clinicAddress}`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  console.log(`  🔍 ${query}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click first result if search results page
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

  // Get rating
  let avgRating = null;
  let totalReviews = null;
  try {
    const ratingEl = page.locator('div.F7nice span[aria-hidden="true"]').first();
    if (await ratingEl.isVisible({ timeout: 5000 })) {
      avgRating = parseFloat((await ratingEl.textContent()).replace(',', '.'));
    }
  } catch {}
  try {
    const reviewCountEl = page.locator('div.F7nice span[aria-label*="리뷰"], div.F7nice span[aria-label*="review"]').first();
    if (await reviewCountEl.isVisible({ timeout: 3000 })) {
      const countText = await reviewCountEl.getAttribute('aria-label') || await reviewCountEl.textContent();
      const match = countText.match(/([\d,]+)/);
      if (match) totalReviews = parseInt(match[1].replace(/,/g, ''));
    }
  } catch {}

  // Open reviews tab
  const reviewSelectors = [
    'button[aria-label*="리뷰"]',
    'button[aria-label*="review"]',
    'button[aria-label*="Reviews"]',
    'div.F7nice',
    'span[aria-label*="리뷰"]',
  ];
  for (const sel of reviewSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click();
        await page.waitForTimeout(2500);
        const hasReviews = await page.locator('div[data-review-id]').first().isVisible({ timeout: 2000 });
        if (hasReviews) break;
      }
    } catch {}
  }

  // Scroll to load reviews
  const scrollable = page.locator('div.m6QErb.DxyBCb.kA9KIf.dS8AEf').first();
  const reviewPanel = page.locator('div[role="main"]').first();
  let reviews = [];
  let previousCount = 0;
  let noNewCount = 0;

  for (let i = 0; i < 30; i++) {
    reviews = await extractReviews(page);
    console.log(`    📜 Scroll ${i + 1}: ${reviews.length} reviews`);
    if (reviews.length === previousCount) {
      noNewCount++;
      if (noNewCount >= 3) break;
    } else {
      noNewCount = 0;
    }
    previousCount = reviews.length;
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

  // Expand "더보기" buttons
  try {
    await page.evaluate(() => {
      document.querySelectorAll('button.w8nwRe.kyuRq').forEach(btn => btn.click());
    });
    await page.waitForTimeout(1500);
    reviews = await extractReviews(page);
  } catch {}

  // Star distribution from reviews
  const starDist = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) starDist[String(r.rating)]++;
  }

  return { avgRating, totalReviews: totalReviews || reviews.length, starDistribution: starDist, reviews };
}

async function extractReviews(page) {
  return await page.evaluate(() => {
    const els = document.querySelectorAll('div[data-review-id]');
    const results = [];
    for (const el of els) {
      try {
        const starEl = el.querySelector('span.kvMYJc');
        const ratingAttr = starEl?.getAttribute('aria-label') || '';
        const ratingMatch = ratingAttr.match(/(\d)/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : null;
        const textEl = el.querySelector('span.wiI7pd');
        const text = textEl?.textContent?.trim() || '';
        const timeEl = el.querySelector('span.rsqaWe');
        const time = timeEl?.textContent?.trim() || '';
        if (text || rating) results.push({ rating, text, time });
      } catch {}
    }
    return results;
  });
}

// ─── LLM Summary ───

async function summarizeReviews(clinicName, reviews, avgRating) {
  if (reviews.length === 0) return null;

  const reviewTexts = reviews
    .filter(r => r.text && r.text.length > 10)
    .slice(0, 100) // cap at 100 for context window
    .map((r, i) => `[${r.rating}★] ${r.text}`)
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

주의사항:
- 한국어로 작성
- 장점은 3-5개, 단점은 1-3개
- 단점이 거의 없으면 1개만 써도 됨
- 키워드는 3-5개 (예: "친절한 상담", "깔끔한 시설", "합리적 가격")
- bestFor는 1문장`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error(`    ❌ LLM 요약 실패: ${err.message}`);
    return null;
  }
}

// ─── Supabase Seeding ───

async function seedToSupabase(results) {
  console.log('\n🌱 Supabase 시딩 시작...');

  // Create clinic_reviews table if it doesn't exist (using raw SQL via RPC or just upsert)
  for (const r of results) {
    if (!r.summary) continue;

    const record = {
      clinic_id: r.clinicId,
      avg_rating: r.avgRating,
      total_reviews: r.totalReviews,
      star_distribution: r.starDistribution,
      summary: r.summary.summary,
      pros: r.summary.pros,
      cons: r.summary.cons,
      keywords: r.summary.keywords,
      best_for: r.summary.bestFor,
      review_count_scraped: r.reviews.length,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('clinic_reviews')
      .upsert(record, { onConflict: 'clinic_id' });

    if (error) {
      console.error(`  ❌ ${r.clinicName}: ${error.message}`);
    } else {
      console.log(`  ✅ ${r.clinicName}`);
    }
  }
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed');

  console.log('=== 강남구 리뷰 스크래핑 + LLM 요약 ===\n');

  // Get gangnam clinics
  const { data: clinics } = await supabase
    .from('clinics')
    .select('id, name, address')
    .eq('district_id', 'gangnam');

  console.log(`📋 강남구 ${clinics.length}개 클리닉\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--lang=ko-KR,ko', '--no-sandbox'],
  });
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
      // Step 1: Scrape reviews
      const data = await scrapeReviews(page, clinic.name, clinic.address);
      console.log(`  ✅ ${data.avgRating}점 | ${data.reviews.length}개 리뷰`);

      // Step 2: LLM summary
      let summary = null;
      if (data.reviews.length > 0) {
        console.log(`  🤖 Claude Sonnet 요약 중...`);
        summary = await summarizeReviews(clinic.name, data.reviews, data.avgRating);
        if (summary) {
          console.log(`  📝 장점: ${summary.pros?.join(', ')}`);
          console.log(`  📝 단점: ${summary.cons?.join(', ')}`);
        }
      }

      results.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        ...data,
        summary,
      });
    } catch (err) {
      console.error(`  ❌ 실패: ${err.message}`);
      results.push({ clinicId: clinic.id, clinicName: clinic.name, avgRating: null, totalReviews: 0, starDistribution: null, reviews: [], summary: null, error: err.message });
    }

    // Polite delay
    if (i < clinics.length - 1) {
      await page.waitForTimeout(2000 + Math.random() * 2000);
    }
  }

  await browser.close();

  // Save raw results
  writeFileSync('./review-results-gangnam.json', JSON.stringify(results, null, 2));
  console.log(`\n💾 결과 저장: ./review-results-gangnam.json`);

  // Seed to Supabase
  if (shouldSeed) {
    await seedToSupabase(results);
  }

  // Summary
  const withReviews = results.filter(r => r.reviews.length > 0);
  const withSummary = results.filter(r => r.summary);
  console.log(`\n=== 완료 ===`);
  console.log(`${withReviews.length}/${results.length} 리뷰 수집`);
  console.log(`${withSummary.length}/${results.length} LLM 요약 완료`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
