import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'src/data/treatment-canonical.json');
const BATCH_SIZE = 20;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractNames(filterIds = null) {
  const names = new Set();
  const files = readdirSync(ROOT).filter(
    f => f.startsWith('crawl-results') && f.endsWith('.json') && !f.includes('toxnfill')
  );
  for (const fname of files) {
    const data = JSON.parse(readFileSync(join(ROOT, fname), 'utf-8'));
    for (const entry of data) {
      if (filterIds && !filterIds.has(entry.clinic.id)) continue;
      for (const cat of entry.categories ?? []) {
        for (const item of cat.items ?? []) {
          const name = item.name?.trim();
          if (name) names.add(name);
        }
      }
    }
  }
  return [...names];
}

async function callClaude(batch) {
  const prompt = `You are a Korean dermatology treatment data normalizer.
For each raw treatment name, output a JSON object with these fields:
- displayName: corrected display name. Rules:
  * Fix spacing: "슈링크유니버스" → "슈링크 유니버스"
  * Normalize units: 유닛→U, unit→U, kj→KJ, 1,000샷→1000샷, 30,000J→30KJ (1KJ=1000J)
  * Remove promo prefixes: [첫방문], [EVENT], ※ notes at end
  * Remove promo suffixes in parens: (체험가), (한정가), (타임세일), (체험), (정가), (한정)
  * Keep brand qualifiers: (국산), (엘러간), (디스포트), (코어톡스) — these affect price
  * Do NOT invent or add information not in the raw name
- canonicalBase: base name without quantity/unit/qualifiers. null for combo packages.
  Examples: "슈링크 유니버스 300샷" → "슈링크 유니버스", "사각턱보톡스 50U (국산)" → "사각턱보톡스"
- quantity: primary numeric quantity as integer. null if none. For "30,000J" → 30 (in KJ).
- unit: canonical unit string — one of: 샷/U/KJ/cc/회/vial/바이알/줄/부위. null if none.
  Normalize: 유닛→U, unit→U, kj→KJ
- qualifier: brand/origin qualifier. Examples: 국산, 수입, 엘러간, 디스포트, 코어톡스, 제오민, 프리미엄. null if none.
- treatmentType: one of: botox/filler/lifting/laser/skinbooster/skincare/body/hair_removal/set/other
  Use "set" for combos with "+". Use "other" if unclear.
- confidence: "high" if clearly one treatment, "medium" if ambiguous, "low" if package/marketing name

Input names:
${JSON.stringify(batch)}

Return ONLY a JSON object mapping each exact input name (as key) to its analysis object.
No markdown, no explanation. Example format:
{"슈링크유니버스 300샷": {"displayName": "슈링크 유니버스 300샷", "canonicalBase": "슈링크 유니버스", "quantity": 300, "unit": "샷", "qualifier": null, "treatmentType": "lifting", "confidence": "high"}}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(text);
}

function loadExisting() {
  if (!existsSync(OUTPUT)) return { version: 1, entries: {} };
  return JSON.parse(readFileSync(OUTPUT, 'utf-8'));
}

function save(data) {
  data.generated = new Date().toISOString();
  writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const incremental = args.includes('--incremental');

  // Gangnam clinic IDs (can be extended or removed for all clinics)
  const gangnamIds = new Set([
    'blivi_gangnam', 'daybeau_07', 'drevers_19', 'ppeum_sinnonhyeon',
    'vands_cheongdam', 'vands_gangnam', 'vands_samseong', 'vands_sinsa', 'vands_yeoksamskin',
  ]);

  const filterIds = args.includes('--all') ? null : gangnamIds;
  const allNames = extractNames(filterIds);

  console.log(`총 고유 시술명: ${allNames.length}개`);

  if (dryRun) return;

  const existing = loadExisting();
  const toProcess = incremental
    ? allNames.filter(n => !existing.entries[n])
    : allNames;

  console.log(`처리할 항목: ${toProcess.length}개 (배치 ${Math.ceil(toProcess.length / BATCH_SIZE)}개)`);

  let done = 0;
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(toProcess.length / BATCH_SIZE);
    process.stdout.write(`배치 ${batchNum}/${total} (${batch.length}개)... `);

    try {
      const result = await callClaude(batch);
      for (const [name, entry] of Object.entries(result)) {
        existing.entries[name] = entry;
      }
      done += Object.keys(result).length;
      save(existing);
      console.log('완료');
    } catch (err) {
      console.log(`오류: ${err.message}`);
      // Retry once
      try {
        const result = await callClaude(batch);
        for (const [name, entry] of Object.entries(result)) {
          existing.entries[name] = entry;
        }
        done += Object.keys(result).length;
        save(existing);
        console.log('재시도 성공');
      } catch (err2) {
        console.log(`재시도 실패, 스킵: ${err2.message}`);
      }
    }
  }

  console.log(`\n완료! ${done}개 정규화 → src/data/treatment-canonical.json`);
}

main().catch(console.error);
