import { supabase } from './supabase';

export interface FeaturedClinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  note: string;
  color: string;
  district_id: string;
  categoryCount: number;
  treatmentCount: number;
  priceRange: { min: number; max: number } | null;
}

export interface ClinicDetail {
  id: string;
  name: string;
  address: string;
  phone: string;
  note: string;
  color: string;
  district_id: string;
  categories: CategoryDetail[];
}

export interface CategoryDetail {
  id: number;
  name: string;
  tag: string | null;
  items: TreatmentDetail[];
}

export interface TreatmentDetail {
  id: number;
  name: string;
  orig_price: number | null;
  event_price: number | null;
  base_price: number | null;
  volume_or_count: string | null;
  area: string | null;
  notes: string | null;
  master_sub: string | null;
}

export async function fetchFeaturedByDistrict(districtId: string): Promise<FeaturedClinic[]> {
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      id, name, address, phone, note, color, district_id,
      categories (
        id,
        treatments ( id, event_price, orig_price )
      )
    `)
    .eq('district_id', districtId)
    .order('name');

  if (error) throw error;
  if (!data) return [];

  return data.map((c: any) => {
    const cats = c.categories || [];
    const allPrices: number[] = [];
    let treatmentCount = 0;
    for (const cat of cats) {
      const items = cat.treatments || [];
      treatmentCount += items.length;
      for (const t of items) {
        const p = t.event_price ?? t.orig_price;
        if (p && p > 0) allPrices.push(p);
      }
    }
    return {
      id: c.id,
      name: c.name,
      address: c.address ?? '',
      phone: c.phone ?? '',
      note: c.note ?? '',
      color: c.color ?? '',
      district_id: c.district_id,
      categoryCount: cats.length,
      treatmentCount,
      priceRange: allPrices.length
        ? { min: Math.min(...allPrices), max: Math.max(...allPrices) }
        : null,
    };
  });
}

export async function fetchAllFeatured(): Promise<FeaturedClinic[]> {
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      id, name, address, phone, note, color, district_id,
      categories (
        id,
        treatments ( id, event_price, orig_price )
      )
    `)
    .order('name');

  if (error) throw error;
  if (!data) return [];

  return data.map((c: any) => {
    const cats = c.categories || [];
    const allPrices: number[] = [];
    let treatmentCount = 0;
    for (const cat of cats) {
      const items = cat.treatments || [];
      treatmentCount += items.length;
      for (const t of items) {
        const p = t.event_price ?? t.orig_price;
        if (p && p > 0) allPrices.push(p);
      }
    }
    return {
      id: c.id,
      name: c.name,
      address: c.address ?? '',
      phone: c.phone ?? '',
      note: c.note ?? '',
      color: c.color ?? '',
      district_id: c.district_id,
      categoryCount: cats.length,
      treatmentCount,
      priceRange: allPrices.length
        ? { min: Math.min(...allPrices), max: Math.max(...allPrices) }
        : null,
    };
  });
}

export async function fetchClinicDetail(clinicId: string): Promise<ClinicDetail | null> {
  const { data, error } = await supabase
    .from('clinics')
    .select(`
      id, name, address, phone, note, color, district_id,
      categories (
        id, name, tag, sort_order,
        treatments (
          id, name, orig_price, event_price, base_price, sort_order,
          volume_or_count, area, notes, master_sub
        )
      )
    `)
    .eq('id', clinicId)
    .single();

  if (error || !data) return null;

  const seenCats = new Set<string>();
  const categories = ((data as any).categories as any[])
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((cat) => {
      const key = `${cat.name}|${cat.tag ?? ''}`;
      if (seenCats.has(key)) return false;
      seenCats.add(key);
      return true;
    })
    .map((cat): CategoryDetail => {
      const seenItems = new Set<string>();
      const items = (cat.treatments as any[])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .filter((t: any) => {
          const key = `${t.name}|${t.volume_or_count ?? ''}|${t.event_price ?? ''}`;
          if (seenItems.has(key)) return false;
          seenItems.add(key);
          return true;
        })
        .map((t: any): TreatmentDetail => ({
          id: t.id,
          name: t.name,
          orig_price: t.orig_price,
          event_price: t.event_price,
          base_price: t.base_price,
          volume_or_count: t.volume_or_count ?? null,
          area: t.area ?? null,
          notes: t.notes ?? null,
          master_sub: t.master_sub ?? null,
        }));
      return { id: cat.id, name: cat.name, tag: cat.tag, items };
    });

  return {
    id: data.id,
    name: data.name,
    address: (data as any).address ?? '',
    phone: (data as any).phone ?? '',
    note: (data as any).note ?? '',
    color: (data as any).color ?? '',
    district_id: (data as any).district_id,
    categories,
  };
}
