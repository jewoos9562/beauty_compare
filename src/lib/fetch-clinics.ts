import { supabase } from './supabase';
import type { Clinic, TreatmentItem, Category } from '@/data/clinics';

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

  return data.map(row => {
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

export async function fetchCrossKeywords(): Promise<{ label: string; keywords: string[] }[]> {
  const { data, error } = await supabase
    .from('cross_keywords')
    .select('label, keywords');

  if (error) throw error;
  return data ?? [];
}
