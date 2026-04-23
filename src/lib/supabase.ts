import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Fetch all rows from a table, paginating past the 1000-row default limit */
export async function fetchAll<T = Record<string, unknown>>(
  table: string,
  select: string = '*',
  options?: { order?: string; ascending?: boolean },
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (options?.order) q = q.order(options.order, { ascending: options.ascending ?? true });
    const { data, error } = await q;
    if (error) { console.error(`fetchAll(${table}):`, error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
