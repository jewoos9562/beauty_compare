'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Clinic } from '@/data/clinics';
import { fetchCrossKeywords } from '@/lib/fetch-clinics';
import type { CompareItem } from '@/app/page';

function fmt(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString() + '원';
}

type Props = {
  clinics: Clinic[];
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
};

type MatchedItem = {
  clinicName: string;
  clinicId: string;
  itemName: string;
  categoryName: string;
  orig: number | null;
  event: number | null;
  base?: number | null;
};

type CrossKeyword = { label: string; keywords: string[] };

export default function CrossCompare({ clinics, toggleCompare, isChecked }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [crossKeywords, setCrossKeywords] = useState<CrossKeyword[]>([]);
  const isComposing = useRef(false);

  useEffect(() => {
    fetchCrossKeywords()
      .then(setCrossKeywords)
      .catch(err => console.error('Failed to fetch keywords:', err));
  }, []);

  const q = searchQuery.trim().toLowerCase();

  const visibleKeywords = q
    ? crossKeywords.filter(kw => kw.label.toLowerCase().includes(q) || kw.keywords.some(k => k.includes(q)))
    : crossKeywords;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      if (!isComposing.current) {
        setSearchQuery(val);
      }
    },
    []
  );

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false;
      setSearchQuery(e.currentTarget.value);
    },
    []
  );

  return (
    <div>
      <input
        type="text"
        placeholder="시술명으로 검색..."
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={inputValue}
        onChange={handleChange}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={handleCompositionEnd}
      />

      {visibleKeywords.length === 0 ? (
        <p className="text-center text-slate-400 py-8">검색 결과가 없습니다</p>
      ) : (
        visibleKeywords.map(kw => (
          <CompareCard
            key={kw.label}
            label={kw.label}
            keywords={kw.keywords}
            clinics={clinics}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        ))
      )}
    </div>
  );
}

function CompareCard({
  label,
  keywords,
  clinics,
  toggleCompare,
  isChecked,
}: {
  label: string;
  keywords: string[];
  clinics: Clinic[];
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const matches: MatchedItem[] = [];

  clinics.forEach(clinic => {
    clinic.categories.forEach(cat => {
      cat.items.forEach(item => {
        const nameLower = item.name.toLowerCase();
        if (keywords.some(kw => nameLower.includes(kw.toLowerCase()))) {
          matches.push({
            clinicName: clinic.name,
            clinicId: clinic.id,
            itemName: item.name,
            categoryName: cat.name,
            orig: item.orig,
            event: item.event,
            base: item.base,
          });
        }
      });
    });
  });

  if (matches.length === 0) return null;

  const sorted = [...matches].sort((a, b) => {
    const pa = a.event ?? a.base ?? a.orig ?? Infinity;
    const pb = b.event ?? b.base ?? b.orig ?? Infinity;
    return pa - pb;
  });

  const lowestPrice = sorted[0].event ?? sorted[0].base ?? sorted[0].orig ?? 0;

  const clinicColors: Record<string, string> = {
    toxnfill: 'border-l-violet-500',
    toxnfill_gangnam: 'border-l-violet-500',
    uni: 'border-l-emerald-500',
    uni_gangnam: 'border-l-emerald-500',
    uni_wangsimni: 'border-l-emerald-500',
    dayview: 'border-l-orange-500',
    dayview_gangnam: 'border-l-orange-500',
    vands_gangnam: 'border-l-blue-500',
    vands_seongsu: 'border-l-blue-500',
    ppeum_gangnam: 'border-l-pink-500',
  };

  const clinicBadgeColors: Record<string, string> = {
    toxnfill: 'bg-violet-100 text-violet-700',
    toxnfill_gangnam: 'bg-violet-100 text-violet-700',
    uni: 'bg-emerald-100 text-emerald-700',
    uni_gangnam: 'bg-emerald-100 text-emerald-700',
    uni_wangsimni: 'bg-emerald-100 text-emerald-700',
    dayview: 'bg-orange-100 text-orange-700',
    dayview_gangnam: 'bg-orange-100 text-orange-700',
    vands_gangnam: 'bg-blue-100 text-blue-700',
    vands_seongsu: 'bg-blue-100 text-blue-700',
    ppeum_gangnam: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{label}</h3>
        <p className="text-[11px] text-slate-400">
          {matches.length}개 항목 · 최저 {fmt(lowestPrice)}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {sorted.map((m, i) => {
          const bestPrice = m.event ?? m.base ?? m.orig ?? 0;
          const compareItem: CompareItem = {
            clinicName: m.clinicName,
            itemName: m.itemName,
            price: bestPrice,
            categoryName: m.categoryName,
          };
          const checked = isChecked(compareItem);
          const isLowest = bestPrice === lowestPrice && bestPrice > 0;

          return (
            <div
              key={`${m.clinicId}-${m.itemName}-${i}`}
              className={`flex items-center gap-3 px-4 py-2.5 border-l-4 ${clinicColors[m.clinicId] ?? 'border-l-slate-300'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${clinicBadgeColors[m.clinicId] ?? 'bg-slate-100 text-slate-600'}`}>
                    {m.clinicName.replace(/ 건대.*/, '')}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{m.categoryName}</span>
                </div>
                <p className="text-sm text-slate-700 mt-0.5 truncate">{m.itemName}</p>
              </div>
              <div className="text-right shrink-0">
                {m.orig != null && m.event != null && (
                  <p className="text-[11px] text-slate-400 line-through">{fmt(m.orig)}</p>
                )}
                <p className={`text-sm font-bold ${isLowest ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {fmt(bestPrice)}
                  {isLowest && <span className="ml-1 text-[10px]">최저</span>}
                </p>
              </div>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleCompare(compareItem)}
                className="w-4 h-4 accent-slate-700 cursor-pointer shrink-0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
