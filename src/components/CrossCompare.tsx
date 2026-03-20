'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Clinic } from '@/data/clinics';
import { fetchCrossKeywords } from '@/lib/fetch-clinics';
import type { CompareItem } from '@/app/page';
import { useI18n } from '@/context/I18nContext';

function parseUnit(name: string): { count: number; unit: string } | null {
  const shot = name.match(/(\d+)\s*샷/);
  if (shot && parseInt(shot[1]) > 1) return { count: parseInt(shot[1]), unit: '샷' };
  const cc = name.match(/(\d+)\s*cc/i);
  if (cc && parseInt(cc[1]) > 1) return { count: parseInt(cc[1]), unit: 'cc' };
  return null;
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

const CHAIN_COLORS: Record<string, [string, string]> = {
  toxnfill: ['border-l-violet-500', 'bg-violet-100 text-violet-700'],
  uni: ['border-l-emerald-500', 'bg-emerald-100 text-emerald-700'],
  dayview: ['border-l-orange-500', 'bg-orange-100 text-orange-700'],
  vands: ['border-l-blue-500', 'bg-blue-100 text-blue-700'],
  ppeum: ['border-l-pink-500', 'bg-pink-100 text-pink-700'],
  evers: ['border-l-amber-500', 'bg-amber-100 text-amber-700'],
  blivi: ['border-l-rose-500', 'bg-rose-100 text-rose-700'],
};

function getChainColors(clinicId: string): [string, string] {
  const chain = Object.keys(CHAIN_COLORS).find(k => clinicId.startsWith(k));
  return chain ? CHAIN_COLORS[chain] : ['border-l-slate-300', 'bg-slate-100 text-slate-600'];
}

export default function CrossCompare({ clinics, toggleCompare, isChecked }: Props) {
  const { t, tt } = useI18n();
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

  // Direct search: find all treatments matching query
  const searchResults = useMemo(() => {
    if (!q) return [];
    const results: MatchedItem[] = [];
    clinics.forEach(clinic => {
      clinic.categories.forEach(cat => {
        cat.items.forEach(item => {
          if (item.name.toLowerCase().includes(q) || tt(item.name).toLowerCase().includes(q)) {
            results.push({
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
    return results.sort((a, b) => {
      const pa = a.event ?? a.base ?? a.orig ?? Infinity;
      const pb = b.event ?? b.base ?? b.orig ?? Infinity;
      return pa - pb;
    });
  }, [q, clinics]);

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
        placeholder={t('search.crossPlaceholder')}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={inputValue}
        onChange={handleChange}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={handleCompositionEnd}
      />

      {q ? (
        /* Direct search mode */
        searchResults.length === 0 ? (
          <p className="text-center text-slate-400 py-8">{t('common.noResults')}</p>
        ) : (
          <SearchResultsList
            query={inputValue}
            results={searchResults}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        )
      ) : (
        /* Cross keyword cards mode */
        crossKeywords.length === 0 ? (
          <p className="text-center text-slate-400 py-8">{t('common.loading')}</p>
        ) : (
          crossKeywords.map(kw => (
            <CompareCard
              key={kw.label}
              label={kw.label}
              keywords={kw.keywords}
              clinics={clinics}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          ))
        )
      )}
    </div>
  );
}

/* Direct search results as a flat sorted list */
function SearchResultsList({
  query,
  results,
  toggleCompare,
  isChecked,
}: {
  query: string;
  results: MatchedItem[];
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { t, tt, fmtPrice } = useI18n();
  const lowestPrice = results[0]
    ? (results[0].event ?? results[0].base ?? results[0].orig ?? 0)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{t('search.results', { query })}</h3>
        <p className="text-[11px] text-slate-400">
          {t('common.items', { count: String(results.length) })} · {t('common.lowest')} {fmtPrice(lowestPrice)}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {results.map((m, i) => {
          const bestPrice = m.event ?? m.base ?? m.orig ?? 0;
          const [borderColor, badgeColor] = getChainColors(m.clinicId);
          const compareItem: CompareItem = {
            clinicName: m.clinicName,
            itemName: m.itemName,
            price: bestPrice,
            categoryName: m.categoryName,
          };
          const checked = isChecked(compareItem);
          const isLowest = bestPrice === lowestPrice && bestPrice > 0;
          const unitInfo = parseUnit(m.itemName);

          return (
            <div
              key={`${m.clinicId}-${m.itemName}-${i}`}
              className={`flex items-center gap-3 px-4 py-2.5 border-l-4 ${borderColor}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${badgeColor}`}>
                    {tt(m.clinicName.replace(/의원\s*/, ''))}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{tt(m.categoryName)}</span>
                </div>
                <p className="text-sm text-slate-700 mt-0.5 truncate">{tt(m.itemName)}</p>
              </div>
              <div className="text-right shrink-0">
                {m.orig != null && m.event != null && (
                  <p className="text-[11px] text-slate-400 line-through">{fmtPrice(m.orig)}</p>
                )}
                <p className={`text-sm font-bold ${isLowest ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {fmtPrice(bestPrice)}
                  {isLowest && <span className="ml-1 text-[10px]">{t('common.lowest')}</span>}
                </p>
                {unitInfo && bestPrice > 0 && (
                  <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(bestPrice / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                )}
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

/* Cross keyword compare card */
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

  const { t, tt, fmtPrice } = useI18n();

  if (matches.length === 0) return null;

  const sorted = [...matches].sort((a, b) => {
    const pa = a.event ?? a.base ?? a.orig ?? Infinity;
    const pb = b.event ?? b.base ?? b.orig ?? Infinity;
    return pa - pb;
  });

  const lowestPrice = sorted[0].event ?? sorted[0].base ?? sorted[0].orig ?? 0;

  return (
    <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{tt(label)}</h3>
        <p className="text-[11px] text-slate-400">
          {t('common.items', { count: String(matches.length) })} · {t('common.lowest')} {fmtPrice(lowestPrice)}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {sorted.map((m, i) => {
          const bestPrice = m.event ?? m.base ?? m.orig ?? 0;
          const [borderColor, badgeColor] = getChainColors(m.clinicId);
          const compareItem: CompareItem = {
            clinicName: m.clinicName,
            itemName: m.itemName,
            price: bestPrice,
            categoryName: m.categoryName,
          };
          const checked = isChecked(compareItem);
          const isLowest = bestPrice === lowestPrice && bestPrice > 0;
          const unitInfo = parseUnit(m.itemName);

          return (
            <div
              key={`${m.clinicId}-${m.itemName}-${i}`}
              className={`flex items-center gap-3 px-4 py-2.5 border-l-4 ${borderColor}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${badgeColor}`}>
                    {tt(m.clinicName.replace(/의원\s*/, ''))}
                  </span>
                  <span className="text-xs text-slate-400 truncate">{tt(m.categoryName)}</span>
                </div>
                <p className="text-sm text-slate-700 mt-0.5 truncate">{tt(m.itemName)}</p>
              </div>
              <div className="text-right shrink-0">
                {m.orig != null && m.event != null && (
                  <p className="text-[11px] text-slate-400 line-through">{fmtPrice(m.orig)}</p>
                )}
                <p className={`text-sm font-bold ${isLowest ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {fmtPrice(bestPrice)}
                  {isLowest && <span className="ml-1 text-[10px]">{t('common.lowest')}</span>}
                </p>
                {unitInfo && bestPrice > 0 && (
                  <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(bestPrice / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                )}
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
