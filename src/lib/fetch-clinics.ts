import { supabase } from './supabase';
import type { Clinic, TreatmentItem, Category } from '@/data/clinics';

export async function fetchClinics(districtId: string): Promise<Clinic[]> {
  // 1. Fetch clinics for this district
  const { data: clinicRows, error: clinicErr } = await supabase
    .from('clinics')
    .select('*')
    .eq('district_id', districtId);

  if (clinicErr) throw clinicErr;
  if (!clinicRows || clinicRows.length === 0) return [];

  const clinics: Clinic[] = [];

  for (const row of clinicRows) {
    // 2. Fetch categories for this clinic
    const { data: catRows, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .eq('clinic_id', row.id)
      .order('sort_order');

    if (catErr) throw catErr;

    const categories: Category[] = [];

    if (catRows && catRows.length > 0) {
      const catIds = catRows.map(c => c.id);

      // 3. Fetch all treatments for these categories in one query
      const { data: treatRows, error: treatErr } = await supabase
        .from('treatments')
        .select('*')
        .in('category_id', catIds)
        .order('sort_order');

      if (treatErr) throw treatErr;

      // Group treatments by category_id
      const treatMap = new Map<number, TreatmentItem[]>();
      for (const t of treatRows ?? []) {
        const items = treatMap.get(t.category_id) ?? [];
        items.push({
          name: t.name,
          orig: t.orig_price,
          event: t.event_price,
          base: t.base_price,
        });
        treatMap.set(t.category_id, items);
      }

      for (const cat of catRows) {
        categories.push({
          name: cat.name,
          tag: cat.tag,
          items: treatMap.get(cat.id) ?? [],
        });
      }
    }

    clinics.push({
      id: row.id,
      name: row.name,
      address: row.address ?? '',
      phone: row.phone ?? '',
      note: row.note ?? '',
      color: row.color ?? '',
      categories,
    });
  }

  return clinics;
}

export async function fetchCrossKeywords(): Promise<{ label: string; keywords: string[] }[]> {
  const { data, error } = await supabase
    .from('cross_keywords')
    .select('label, keywords');

  if (error) throw error;
  return data ?? [];
}
