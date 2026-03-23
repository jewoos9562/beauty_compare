import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'src/data/treatment-canonical.json');
const BATCH_SIZE = 20;

// Load .env.local
config({ path: join(ROOT, '.env.local') });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fetchAllNames(districtId = null) {
  const names = new Set();
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    let query = supabase
      .from('treatments')
      .select('name, categories(clinic_id, clinics(district_id))')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (districtId) {
        const did = row.categories?.clinics?.district_id;
        if (did !== districtId) continue;
      }
      const name = row.name?.trim();
      if (name) names.add(name);
    }

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return [...names];
}

async function callClaude(batch) {
  const prompt = `You are a Korean dermatology treatment data normalizer.
For each raw treatment name, extract structured fields. Output a JSON object per name with:

- treatmentName: the core procedure name only, no body part, no quantity, no feature tags.
  Examples: "손등+손가락 제모 1회" → "제모", "사각턱보톡스 50U (국산)" → "보톡스", "슈링크유니버스 300샷" → "슈링크 유니버스"
  Fix spacing: "슈링크유니버스" → "슈링크 유니버스". null for multi-treatment packages.

- quantity: numeric quantity as integer. null if none.
  Normalize: 1,000샷→1000, 30,000J→30 (KJ), 유닛/unit→(keep number, unit becomes U)

- unit: canonical unit — one of: 샷/U/KJ/cc/회/vial/바이알/줄/부위. null if none.
  Normalize: 유닛→U, unit→U, kj→KJ

- bodyPart: body area/part mentioned in the name. null if none.
  Examples: "손등+손가락 제모" → "손등+손가락", "사각턱보톡스" → "사각턱", "볼/앞광대필러" → "볼/앞광대"
  "주름보톡스(1부위)" → "1부위", "얼굴 점제거" → "얼굴"

- feature: special characteristic. One of: 첫방문/이벤트/한정가/리뷰혜택/일반. null if none.
  Map: [첫방문]→첫방문, (체험가)/(한정가)/(타임세일)/(한정)→한정가, [EVENT]/이벤트→이벤트, 리뷰남길시→리뷰혜택

- origin: brand/origin qualifier. null if none.
  Examples: 국산, 수입, 엘러간, 디스포트, 코어톡스, 제오민, 리쥬란PN, 쥬베룩, 레스틸렌

- confidence: "high" if clearly parsed, "medium" if ambiguous, "low" if multi-treatment package

Input names:
${JSON.stringify(batch)}

Return ONLY a JSON object mapping each exact input name (as key) to its analysis.
No markdown. Example:
{
  "손등+손가락 제모 1회": {"treatmentName":"제모","quantity":1,"unit":"회","bodyPart":"손등+손가락","feature":null,"origin":null,"confidence":"high"},
  "[첫방문] 슈링크유니버스 300샷": {"treatmentName":"슈링크 유니버스","quantity":300,"unit":"샷","bodyPart":null,"feature":"첫방문","origin":null,"confidence":"high"},
  "사각턱보톡스(50유닛당) (국산)": {"treatmentName":"보톡스","quantity":50,"unit":"U","bodyPart":"사각턱","feature":null,"origin":"국산","confidence":"high"}
}`;

  const msg = await anthropic.messages.create({
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
  const districtArg = args.find(a => a.startsWith('--district='))?.split('=')[1] ?? null;

  console.log(`Supabase에서 시술명 가져오는 중${districtArg ? ` (지역: ${districtArg})` : ' (전체)'}...`);
  const allNames = await fetchAllNames(districtArg);
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
