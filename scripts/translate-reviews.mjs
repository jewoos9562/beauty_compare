import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANGS = {
  en: 'English',
  es: 'Spanish',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
};

async function translateReview(clinicId, review, langCode, langName) {
  const { summary, pros, cons, keywords, bestFor } = review;

  const prompt = `Translate the following Korean dermatology clinic review data into ${langName}.
Return ONLY a valid JSON object with the same structure. Keep medical/treatment terms natural in ${langName}.

Input JSON:
${JSON.stringify({ summary, pros, cons, keywords, bestFor }, null, 2)}

Return only the translated JSON object, no markdown, no explanation.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

async function main() {
  const targetIds = process.argv.slice(2);

  const reviews = JSON.parse(readFileSync(join(ROOT, 'src/data/reviews.json'), 'utf-8'));

  // Load existing translations if any
  let translated = {};
  try {
    translated = JSON.parse(readFileSync(join(ROOT, 'src/data/reviews-translated.json'), 'utf-8'));
  } catch {}

  const idsToProcess = targetIds.length > 0
    ? targetIds.filter(id => reviews[id])
    : Object.keys(reviews);

  console.log(`Translating ${idsToProcess.length} clinics into ${Object.keys(LANGS).length} languages...`);

  for (const clinicId of idsToProcess) {
    const review = reviews[clinicId];
    if (!review.summary) {
      console.log(`  [skip] ${clinicId} — no summary`);
      continue;
    }

    console.log(`\n[${clinicId}]`);

    for (const [langCode, langName] of Object.entries(LANGS)) {
      // Skip if already translated
      if (translated[langCode]?.[clinicId]) {
        console.log(`  ${langCode}: already done, skipping`);
        continue;
      }

      process.stdout.write(`  ${langCode} (${langName})... `);
      try {
        const result = await translateReview(clinicId, review, langCode, langName);
        if (!translated[langCode]) translated[langCode] = {};
        translated[langCode][clinicId] = {
          rating: review.rating,
          total: review.total,
          stars: review.stars,
          ...result,
        };
        console.log('done');
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
      }

      // Save after each translation to avoid losing progress
      writeFileSync(
        join(ROOT, 'src/data/reviews-translated.json'),
        JSON.stringify(translated, null, 2),
        'utf-8'
      );
    }
  }

  console.log('\nDone! Saved to src/data/reviews-translated.json');
}

main().catch(console.error);
