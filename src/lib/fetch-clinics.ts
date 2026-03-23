import { supabase } from './supabase';
import type { Clinic, TreatmentItem, Category } from '@/data/clinics';
import { parseTreatment } from '@/lib/group-treatments';

export async function fetchClinics(districtId: string): Promise<Clinic[]> {
  // Single query: clinics → categories → treatments (nested join)
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      id, name, address, phone, note, color,
      categories (
        id, name, tag, sort_order,
        treatments (
          name, orig_price, event_price, base_price, sort_order
        )
      )
    `)
    .eq('district_id', districtId)
    .order('name');

  if (error) throw error;
  if (!data) return [];

  // Deduplicate clinics with the same name (keep the one with more categories)
  const clinicMap = new Map<string, typeof data[number]>();
  for (const row of data) {
    const existing = clinicMap.get(row.name);
    if (!existing || (row.categories as any[]).length > (existing.categories as any[]).length) {
      clinicMap.set(row.name, row);
    }
  }
  const uniqueClinics = Array.from(clinicMap.values());

  return uniqueClinics.map(row => {
    // Deduplicate categories (same name+tag = duplicate)
    const seenCats = new Set<string>();
    const dedupedCats = (row.categories as any[])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .filter((cat: any) => {
        const key = `${cat.name}|${cat.tag ?? ''}`;
        if (seenCats.has(key)) return false;
        seenCats.add(key);
        return true;
      });

    return {
      id: row.id,
      name: row.name,
      address: row.address ?? '',
      phone: row.phone ?? '',
      note: row.note ?? '',
      color: row.color ?? '',
      categories: dedupedCats.map((cat: any): Category => {
        // Deduplicate treatments within category (same name = duplicate)
        const seenItems = new Set<string>();
        const items = (cat.treatments as any[])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .filter((t: any) => {
            if (seenItems.has(t.name)) return false;
            seenItems.add(t.name);
            return true;
          })
          .map((t: any): TreatmentItem => ({
            name: t.name,
            orig: t.orig_price,
            event: t.event_price,
            base: t.base_price,
          }));
        return { name: cat.name, tag: cat.tag, items };
      }),
    };
  });
}

export async function fetchActiveDistricts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('clinics')
    .select('district_id');
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.district_id, (counts.get(row.district_id) || 0) + 1);
  }
  return counts;
}

export async function fetchCrossKeywords(): Promise<{ label: string; keywords: string[] }[]> {
  const { data, error } = await supabase
    .from('cross_keywords')
    .select('label, keywords');

  if (error) throw error;
  if (!data) return [];

  // Deduplicate by label
  const seen = new Set<string>();
  const unique = data.filter(row => {
    if (seen.has(row.label)) return false;
    seen.add(row.label);
    return true;
  });

  // Merge variant entries (e.g. "울쎄라피 프라임 300샷" + "100샷" → "울쎄라피 프라임")
  // If a broader entry exists (same baseName without quantity), skip the specific one
  const baseLabels = new Set<string>();
  const variantEntries: typeof unique = [];
  const broadEntries: typeof unique = [];

  for (const row of unique) {
    const parsed = parseTreatment(row.label);
    if (parsed.quantity != null) {
      variantEntries.push(row);
    } else {
      broadEntries.push(row);
      baseLabels.add(parsed.baseName.replace(/\s+/g, ' ').trim().toLowerCase());
    }
  }

  // Merge variants by baseName into one card, combine keywords
  const variantsByBase = new Map<string, { label: string; keywords: string[] }>();
  for (const row of variantEntries) {
    const parsed = parseTreatment(row.label);
    const base = parsed.baseName.replace(/\s+/g, ' ').trim();
    const baseLower = base.toLowerCase();

    // Skip if a broader entry already covers this
    if (baseLabels.has(baseLower)) continue;

    const existing = variantsByBase.get(baseLower);
    if (existing) {
      // Merge keywords
      for (const kw of row.keywords) {
        if (!existing.keywords.includes(kw)) existing.keywords.push(kw);
      }
    } else {
      variantsByBase.set(baseLower, { label: base, keywords: [...row.keywords] });
    }
  }

  return [...broadEntries, ...Array.from(variantsByBase.values())];
}
