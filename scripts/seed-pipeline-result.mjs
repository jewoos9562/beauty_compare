#!/usr/bin/env node
/**
 * Seed script for pipeline crawl results (v2 format).
 *
 * Usage:
 *   node scripts/seed-pipeline-result.mjs --input crawl-results-pipeline-vands_cheongdam-v2.json
 *   node scripts/seed-pipeline-result.mjs --input result.json --district seongdong
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildAliasMap, MASTER_LIST } from './crawl-pipeline/master-list.mjs';

// Build reverse lookup: for each master treatment, list all aliases
const ALIAS_MAP = buildAliasMap();
// Build: masterName → Set of aliases (excluding the master name itself)
const MASTER_ALIASES = new Map();
for (const m of MASTER_LIST) {
  const aliases = new Set();
  for (const a of m.aliases || []) {
    const norm = a.replace(/\s+/g, '').toLowerCase();
    if (norm !== m.name.replace(/\s+/g, '').toLowerCase()) {
      aliases.add(a);
    }
  }
  if (aliases.size > 0) MASTER_ALIASES.set(m.name, aliases);
}

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const inputPath = getArg('--input');
const districtOverride = getArg('--district');

if (!inputPath) {
  console.error('Usage: node scripts/seed-pipeline-result.mjs --input <json-path> [--district <id>]');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load .env.local (simple key=value parser, no dependency needed)
// ---------------------------------------------------------------------------
function loadEnv(filePath) {
  try {
    const text = readFileSync(filePath, 'utf-8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* ignore if missing */ }
}

loadEnv(resolve(process.cwd(), '.env.local'));

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env / .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// MAJOR_TO_TAG mapping
// ---------------------------------------------------------------------------
const MAJOR_TO_TAG = {
  '리프팅': 'lifting',
  '필러': 'filler',
  '보톡스': 'botox',
  '피부': 'skin',
  '바디': 'body',
  '제모': 'hair_removal',
  '약처방': 'prescription',
  '제증명': 'certificate',
  '미분류': 'unclassified',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Read input JSON
  const fullPath = resolve(process.cwd(), inputPath);
  console.log(`Reading ${fullPath} ...`);
  const data = JSON.parse(readFileSync(fullPath, 'utf-8'));

  if (!Array.isArray(data) || data.length === 0) {
    console.error('Expected a non-empty JSON array');
    process.exit(1);
  }

  for (const entry of data) {
    const { clinic, categories } = entry;
    if (!clinic || !categories) {
      console.warn('Skipping entry without clinic/categories');
      continue;
    }

    const districtId = districtOverride || clinic.district_id || 'gangnam';

    // ----- 1. Upsert clinic -----
    const clinicRecord = {
      id: clinic.id,
      district_id: districtId,
      name: clinic.name,
      address: clinic.address || null,
      phone: clinic.phone || null,
      note: clinic.note || null,
      color: clinic.color || null,
    };

    console.log(`\nUpserting clinic: ${clinic.id} (${clinic.name || 'no name'}) ...`);
    const { error: clinicErr } = await supabase
      .from('clinics')
      .upsert(clinicRecord, { onConflict: 'id' });
    if (clinicErr) {
      console.error(`  ✗ Clinic upsert failed: ${clinicErr.message}`);
      process.exit(1);
    }
    console.log(`  ✓ Clinic upserted`);

    // ----- 2. Delete existing categories (cascades to treatments) -----
    console.log(`  Deleting existing categories for ${clinic.id} ...`);
    const { error: delErr } = await supabase
      .from('categories')
      .delete()
      .eq('clinic_id', clinic.id);
    if (delErr) {
      console.error(`  ✗ Category delete failed: ${delErr.message}`);
      process.exit(1);
    }
    console.log(`  ✓ Old categories deleted`);

    // ----- 2.5. Propagate clinic_alias within same master_treatment -----
    // If some items of a master_treatment have clinic_alias but others don't, propagate it
    const aliasByMaster = new Map();
    for (const cat of categories) {
      for (const t of cat.items || []) {
        if (t.clinic_alias && t.master_treatment) {
          aliasByMaster.set(t.master_treatment, t.clinic_alias);
        }
      }
    }
    if (aliasByMaster.size > 0) {
      let propagated = 0;
      for (const cat of categories) {
        for (const t of cat.items || []) {
          if (!t.clinic_alias && t.master_treatment && aliasByMaster.has(t.master_treatment)) {
            // Also check treatment_name matches master
            if (t.treatment_name === t.master_treatment || t.treatment_name === aliasByMaster.get(t.master_treatment)) {
              t.clinic_alias = aliasByMaster.get(t.master_treatment);
              propagated++;
            }
          }
        }
      }
      if (propagated > 0) console.log(`  ✓ Alias propagated: ${propagated} items`);
    }

    // ----- 3. Insert categories + treatments -----
    let totalTreatments = 0;

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const tag = cat.tag || MAJOR_TO_TAG[cat.name] || 'unclassified';

      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .insert({
          clinic_id: clinic.id,
          name: cat.name,
          tag,
          sort_order: i + 1,
        })
        .select('id')
        .single();

      if (catErr) {
        console.error(`  ✗ Category insert "${cat.name}": ${catErr.message}`);
        process.exit(1);
      }

      const categoryId = catData.id;
      const items = cat.items || [];

      if (items.length > 0) {
        const treatments = items.map((t, j) => ({
          category_id: categoryId,
          name: t.treatment_name,
          orig_price: t.orig_price ?? null,
          event_price: t.event_price ?? null,
          sort_order: j + 1,
          volume_or_count: t.volume_or_count ?? null,
          area: t.area ?? null,
          purpose: t.purpose ?? null,
          notes: (() => {
            const parts = [];
            if (t.clinic_alias) parts.push(`[${t.clinic_alias}]`);
            if (t.notes) parts.push(t.notes);
            return parts.length > 0 ? parts.join(' ') : null;
          })(),
          master_sub: t.master_sub ?? null,
          master_treatment: t.master_treatment ?? null,
          promo: t.promo ?? null,
        }));

        const { error: tErr } = await supabase.from('treatments').insert(treatments);
        if (tErr) {
          console.error(`  ✗ Treatments insert for "${cat.name}": ${tErr.message}`);
          process.exit(1);
        }
        totalTreatments += items.length;
      }

      console.log(`  ✓ ${cat.name} (${tag}) — ${items.length} treatments`);
    }

    console.log(`\n  Done: ${categories.length} categories, ${totalTreatments} treatments total for ${clinic.id}`);
  }

  console.log('\n=== Seed complete ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
