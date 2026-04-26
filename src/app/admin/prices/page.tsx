'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Treatment {
  id: number;
  hira_id: string;
  clinic_name: string;
  category: string | null;
  standard_name: string | null;
  brand: string | null;
  option: string | null;
  area: string | null;
  orig_price: number | null;
  discount_price: number | null;
  note: string | null;
}

const CATEGORIES = [
  '\uB9AC\uD504\uD305 / \uD0C4\uB825',
  '\uC050\uB760 / \uC8FC\uC0AC',
  '\uC2A4\uD0A8\uBD80\uC2A4\uD130',
  '\uB808\uC774\uC800 / \uD53C\uBD80\uD1A4',
  '\uBBF8\uBC31 \uC8FC\uC0AC',
  '\uBC14\uB514',
  '\uC81C\uBAA8',
];

const CAT_COLORS: Record<string, string> = {
  '\uB9AC\uD504\uD305 / \uD0C4\uB825': 'bg-violet-100 text-violet-700',
  '\uC050\uB760 / \uC8FC\uC0AC': 'bg-pink-100 text-pink-700',
  '\uC2A4\uD0A8\uBD80\uC2A4\uD130': 'bg-sky-100 text-sky-700',
  '\uB808\uC774\uC800 / \uD53C\uBD80\uD1A4': 'bg-amber-100 text-amber-700',
  '\uBBF8\uBC31 \uC8FC\uC0AC': 'bg-emerald-100 text-emerald-700',
  '\uBC14\uB514': 'bg-orange-100 text-orange-700',
  '\uC81C\uBAA8': 'bg-slate-100 text-slate-600',
};

function fmtPrice(n: number | null) {
  if (n == null) return '-';
  if (n >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '\uB9CC';
  return n.toLocaleString() + '\uC6D0';
}

export default function PricesPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedStd, setSelectedStd] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const all: Treatment[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from('classified_treatments')
          .select('id, hira_id, clinic_name, "\uB300\uBD84\uB958", "\uD45C\uC900\uBA85", "\uBE0C\uB79C\uB4DC_\uC7A5\uBE44", "\uC2DC\uC220_\uC635\uC158", "\uBD80\uC704", "\uC815\uAC00", "\uD560\uC778\uAC00", "\uBE44\uACE0"')
          .order('id')
          .range(from, from + 999);
        if (!data || data.length === 0) break;
        all.push(...data.map((d: Record<string, unknown>) => ({
          id: d.id as number,
          hira_id: d.hira_id as string,
          clinic_name: d.clinic_name as string,
          category: d['\uB300\uBD84\uB958'] as string | null,
          standard_name: d['\uD45C\uC900\uBA85'] as string | null,
          brand: d['\uBE0C\uB79C\uB4DC_\uC7A5\uBE44'] as string | null,
          option: d['\uC2DC\uC220_\uC635\uC158'] as string | null,
          area: d['\uBD80\uC704'] as string | null,
          orig_price: d['\uC815\uAC00'] as number | null,
          discount_price: d['\uD560\uC778\uAC00'] as number | null,
          note: d['\uBE44\uACE0'] as string | null,
        })));
        if (data.length < 1000) break;
        from += 1000;
      }
      setTreatments(all);
      setLoading(false);
    }
    load();
  }, []);

  const stdNames = useMemo(() => {
    const set = new Set<string>();
    treatments.forEach(t => { if (t.standard_name) set.add(t.standard_name); });
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [treatments]);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    treatments.forEach(t => { m[t.category || '\uAE30\uD0C0'] = (m[t.category || '\uAE30\uD0C0'] || 0) + 1; });
    return m;
  }, [treatments]);

  const filtered = useMemo(() => {
    let list = treatments;
    if (selectedCat) list = list.filter(t => t.category === selectedCat);
    if (selectedStd) list = list.filter(t => t.standard_name === selectedStd);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.clinic_name.toLowerCase().includes(q) ||
        (t.brand || '').toLowerCase().includes(q) ||
        (t.option || '').toLowerCase().includes(q) ||
        (t.standard_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [treatments, selectedCat, selectedStd, search]);

  const grouped = useMemo(() => {
    const byStd = new Map<string, Treatment[]>();
    for (const t of filtered) {
      const key = t.standard_name || '\uBBF8\uBD84\uB958';
      if (!byStd.has(key)) byStd.set(key, []);
      byStd.get(key)!.push(t);
    }
    return [...byStd.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'));
  }, [filtered]);

  const clinicCount = useMemo(() => new Set(treatments.map(t => t.clinic_name)).size, [treatments]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="glass border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <span className="text-lg">{'\uD83D\uDC8E'}</span>
              <span className="font-bold text-sm gradient-brand-text hidden sm:inline">En beaut&eacute;</span>
            </Link>
            <span className="text-[var(--border)]">|</span>
            <span className="text-sm font-semibold">{'\uAC00\uACA9 \uBE44\uAD50'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="px-2.5 py-1 bg-[var(--primary-soft)] text-[var(--primary)] rounded-full">{clinicCount}{'\uAC1C \uD074\uB9AC\uB2C9'}</span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{treatments.length}{'\uAC1C \uC2DC\uC220'}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="space-y-3 mb-6">
          <input
            type="text"
            placeholder={'\uC2DC\uC220\uBA85, \uBE0C\uB79C\uB4DC, \uD074\uB9AC\uB2C9 \uAC80\uC0C9...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedCat(null); setSelectedStd(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!selectedCat ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-white border border-[var(--border)] text-[var(--text-muted)]'}`}
            >
              {'\uC804\uCCB4'} {treatments.length}
            </button>
            {CATEGORIES.map(cat => {
              const count = catCounts[cat] || 0;
              if (count === 0) return null;
              return (
                <button key={cat}
                  onClick={() => { setSelectedCat(selectedCat === cat ? null : cat); setSelectedStd(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedCat === cat ? 'bg-[var(--primary)] text-white shadow-sm' : `${CAT_COLORS[cat] || 'bg-slate-100'}`}`}
                >
                  {cat} {count}
                </button>
              );
            })}
          </div>

          {selectedCat && (
            <div className="flex flex-wrap gap-1.5">
              {stdNames.filter(s => treatments.some(t => t.standard_name === s && t.category === selectedCat)).map(std => (
                <button key={std}
                  onClick={() => setSelectedStd(selectedStd === std ? null : std)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${selectedStd === std ? 'bg-[var(--text)] text-white' : 'bg-white border border-[var(--border)] text-[var(--text-muted)]'}`}
                >
                  {std}
                </button>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="text-lg mb-1">{'\uC2DC\uC220 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([stdName, items]) => {
              const cat = items[0]?.category || '\uAE30\uD0C0';
              const allPrices = items.map(t => t.discount_price ?? t.orig_price ?? Infinity).filter(p => p < Infinity);
              const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : Infinity;

              return (
                <div key={stdName} className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-[var(--border-soft)] flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${CAT_COLORS[cat] || 'bg-slate-100 text-slate-600'}`}>{cat}</span>
                    <h3 className="text-sm font-bold text-[var(--text)]">{stdName}</h3>
                    <span className="text-[11px] text-[var(--text-light)]">{items.length}{'\uAC1C'}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-soft)] text-[11px] text-[var(--text-light)] uppercase">
                          <th className="px-5 py-2 text-left font-semibold">{'\uD074\uB9AC\uB2C9'}</th>
                          <th className="px-3 py-2 text-left font-semibold">{'\uBE0C\uB79C\uB4DC/\uC7A5\uBE44'}</th>
                          <th className="px-3 py-2 text-left font-semibold">{'\uC635\uC158'}</th>
                          <th className="px-3 py-2 text-left font-semibold">{'\uBD80\uC704'}</th>
                          <th className="px-3 py-2 text-right font-semibold">{'\uC815\uAC00'}</th>
                          <th className="px-3 py-2 text-right font-semibold">{'\uD560\uC778\uAC00'}</th>
                          <th className="px-3 py-2 text-left font-semibold">{'\uBE44\uACE0'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(t => {
                          const price = t.discount_price ?? t.orig_price ?? Infinity;
                          const isLowest = price === lowestPrice && price < Infinity;
                          return (
                            <tr key={t.id} className={`border-b border-[var(--border-soft)] hover:bg-slate-50 ${isLowest ? 'bg-emerald-50/50' : ''}`}>
                              <td className="px-5 py-2.5 text-sm font-medium text-[var(--text)]">{t.clinic_name}</td>
                              <td className="px-3 py-2.5 text-xs text-[var(--primary)] font-semibold">{t.brand || '-'}</td>
                              <td className="px-3 py-2.5 text-xs text-[var(--text)]">{t.option || '-'}</td>
                              <td className="px-3 py-2.5 text-xs text-[var(--text-muted)]">{t.area || '-'}</td>
                              <td className="px-3 py-2.5 text-right">
                                {t.orig_price ? <span className="text-xs text-[var(--text-light)] line-through">{fmtPrice(t.orig_price)}</span> : <span className="text-xs text-[var(--text-light)]">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <span className={`text-sm font-bold ${isLowest ? 'text-emerald-600' : 'text-[var(--text)]'}`}>
                                  {fmtPrice(t.discount_price ?? t.orig_price)}
                                  {isLowest && <span className="ml-1 text-[10px]">{'\uCD5C\uC800'}</span>}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-[var(--text-muted)]">{t.note || ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
