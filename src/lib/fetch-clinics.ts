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

  return data.map(row => ({
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    phone: row.phone ?? '',
    note: row.note ?? '',
    color: row.color ?? '',
    categories: (row.categories as any[])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((cat: any): Category => ({
        name: cat.name,
        tag: cat.tag,
        items: (cat.treatments as any[])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((t: any): TreatmentItem => ({
            name: t.name,
            orig: t.orig_price,
            event: t.event_price,
            base: t.base_price,
          })),
      })),
  }));
}

export async function fetchCrossKeywords(): Promise<{ label: string; keywords: string[] }[]> {
  const { data, error } = await supabase
    .from('cross_keywords')
    .select('label, keywords');

  if (error) throw error;
  return data ?? [];
}
