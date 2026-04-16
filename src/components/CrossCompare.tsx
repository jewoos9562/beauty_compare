'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Clinic } from '@/data/clinics';
import { fetchCrossKeywords } from '@/lib/fetch-clinics';
import type { CompareItem } from '@/types/compare';
import { useI18n } from '@/context/I18nContext';
import { parseTreatment } from '@/lib/group-treatments';

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

type GroupedMatch = {
  baseName: string;
  items: (MatchedItem & { quantity: number | null; unit: string | null })[];
};

/** Group matched items by parsed baseName (e.g. "울쎄라피 프라임 300샷" + "600샷" → one group) */
function groupMatchedItems(items: MatchedItem[]): { singles: MatchedItem[]; groups: GroupedMatch[] } {
  const byBase = new Map<string, (MatchedItem & { quantity: number | null; unit: string | null })[]>();

  for (const m of items) {
    const parsed = parseTreatment(m.itemName);
    if (parsed.isSet) {
      // Sets stay as singles in cross compare
      const key = '__set__' + m.itemName;
      if (!byBase.has(key)) byBase.set(key, []);
      byBase.get(key)!.push({ ...m, quantity: null, unit: null });
      continue;
    }
    // Normalize baseName: remove price tags, collapse spacing
    let base = parsed.baseName
      .replace(/\s*\((체험가|한정가|타임세일|체험|정가|한정)\)\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base)!.push({ ...m, quantity: parsed.quantity, unit: parsed.unit });
  }

  const singles: MatchedItem[] = [];
  const groups: GroupedMatch[] = [];

  for (const [key, items] of byBase) {
    if (items.length === 1) {
      singles.push(items[0]);
    } else {
      // Check if all items have the same clinic+name (true duplicate) or different variants
      const uniqueNames = new Set(items.map(i => i.itemName));
      if (uniqueNames.size === 1) {
        // All same name — just singles (different clinics same treatment)
        singles.push(...items);
      } else {
        items.sort((a, b) => {
          const pa = a.event ?? a.base ?? a.orig ?? Infinity;
          const pb = b.event ?? b.base ?? b.orig ?? Infinity;
          return pa - pb;
        });
        groups.push({ baseName: key.startsWith('__set__') ? key.slice(7) : key, items });
      }
    }
  }

  singles.sort((a, b) => {
    const pa = a.event ?? a.base ?? a.orig ?? Infinity;
    const pb = b.event ?? b.base ?? b.orig ?? Infinity;
    return pa - pb;
  });

  return { singles, groups };
}

/** Deduplicate: same clinic + same treatment name → keep the one with lowest price */
function deduplicateMatches(items: MatchedItem[]): MatchedItem[] {
  const best = new Map<string, MatchedItem>();
  for (const m of items) {
    const key = `${m.clinicId}|${m.itemName}`;
    const price = m.event ?? m.base ?? m.orig ?? Infinity;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, m);
    } else {
      const existingPrice = existing.event ?? existing.base ?? existing.orig ?? Infinity;
      if (price < existingPrice) best.set(key, m);
    }
  }
  return Array.from(best.values()).sort((a, b) => {
    const pa = a.event ?? a.base ?? a.orig ?? Infinity;
    const pb = b.event ?? b.base ?? b.orig ?? Infinity;
    return pa - pb;
  });
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

  // Direct search: find all treatments matching query (dedup per clinic+name)
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
    return deduplicateMatches(results);
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

  const { singles, groups } = useMemo(() => groupMatchedItems(results), [results]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{t('search.results', { query })}</h3>
        <p className="text-[11px] text-slate-400">
          {t('common.items', { count: String(results.length) })} · {t('common.lowest')} {fmtPrice(lowestPrice)}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {groups.map(group => (
          <CrossGroup
            key={group.baseName}
            group={group}
            lowestPrice={lowestPrice}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        ))}
        {singles.map((m, i) => (
          <MatchRow
            key={`${m.clinicId}-${m.itemName}-${i}`}
            item={m}
            lowestPrice={lowestPrice}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        ))}
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

  const deduped = deduplicateMatches(matches);
  const { singles, groups } = groupMatchedItems(deduped);
  const allItems = deduped;
  const lowestPrice = allItems.length > 0
    ? Math.min(...allItems.map(m => m.event ?? m.base ?? m.orig ?? Infinity))
    : 0;

  return (
    <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{tt(label)}</h3>
        <p className="text-[11px] text-slate-400">
          {t('common.items', { count: String(allItems.length) })} · {t('common.lowest')} {fmtPrice(lowestPrice)}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {groups.map(group => (
          <CrossGroup
            key={group.baseName}
            group={group}
            lowestPrice={lowestPrice}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        ))}
        {singles.map((m, i) => (
          <MatchRow
            key={`${m.clinicId}-${m.itemName}-${i}`}
            item={m}
            lowestPrice={lowestPrice}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        ))}
      </div>
    </div>
  );
}

/* Single match row */
function MatchRow({
  item: m,
  lowestPrice,
  toggleCompare,
  isChecked,
}: {
  item: MatchedItem;
  lowestPrice: number;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { t, tt, fmtPrice } = useI18n();
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
    <div className={`flex items-center gap-3 px-4 py-2.5 border-l-4 ${borderColor}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${badgeColor}`}>
            {tt(m.clinicName.replace(/의원\s*/, ''))}
          </span>
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
}

/* Grouped treatments (same base name, different quantities) */
function CrossGroup({
  group,
  lowestPrice,
  toggleCompare,
  isChecked,
}: {
  group: GroupedMatch;
  lowestPrice: number;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { t, tt, fmtPrice } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/50 hover:bg-slate-100 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{tt(group.baseName)}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {t('group.options', { count: String(group.items.length) })}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {expanded && (
        <div className="divide-y divide-slate-50">
          {group.items.map((m, i) => {
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
            const label = m.quantity != null && m.unit
              ? `${m.quantity.toLocaleString()}${tt(m.unit)}`
              : tt(m.itemName);

            return (
              <div
                key={`${m.clinicId}-${m.itemName}-${i}`}
                className={`flex items-center gap-3 px-4 py-2 pl-6 border-l-4 ${borderColor}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${badgeColor}`}>
                      {tt(m.clinicName.replace(/의원\s*/, ''))}
                    </span>
                    <span className="text-xs text-slate-500">{label}</span>
                  </div>
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
      )}
    </div>
  );
}
