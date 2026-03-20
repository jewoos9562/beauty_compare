'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import type { Clinic, Category, TreatmentItem } from '@/data/clinics';
import { TAG_CONFIG } from '@/data/clinics';
import type { CompareItem } from '@/app/page';
import { useI18n } from '@/context/I18nContext';
import { groupItems } from '@/lib/group-treatments';

function parseUnit(name: string): { count: number; unit: string } | null {
  const shot = name.match(/(\d+)\s*샷/);
  if (shot && parseInt(shot[1]) > 1) return { count: parseInt(shot[1]), unit: '샷' };
  const cc = name.match(/(\d+)\s*cc/i);
  if (cc && parseInt(cc[1]) > 1) return { count: parseInt(cc[1]), unit: 'cc' };
  return null;
}

type Props = {
  clinic: Clinic;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
};

export default function ClinicView({ clinic, toggleCompare, isChecked }: Props) {
  const { t, tt } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const isComposing = useRef(false);

  // Build filter list from clinic's actual tags
  const clinicTags = new Set<string>();
  let hasBase = false;
  clinic.categories.forEach(cat => {
    if (cat.tag) clinicTags.add(cat.tag);
    else hasBase = true;
  });

  const allFilterKeys = ['first','event','hot','weekday','best','new','botox','filler','lifting','skinbooster','laser','hair_removal','skincare','body','neck','male'];
  const allFilters = allFilterKeys.map(key => ({ key, label: t('tag.' + key) }));

  const filters = [
    { key: 'all', label: t('filter.all') },
    ...allFilters.filter(f => clinicTags.has(f.key)),
  ];
  if (hasBase) filters.push({ key: 'base', label: t('filter.base') });

  // Reset filter if current filter doesn't exist for this clinic
  const effectiveFilter =
    filters.some(f => f.key === activeFilter) ? activeFilter : 'all';

  // Filter categories
  const filtered = clinic.categories.filter(cat => {
    if (effectiveFilter === 'all') return true;
    if (effectiveFilter === 'base') return cat.tag === null;
    return cat.tag === effectiveFilter;
  });

  // Search
  const q = searchQuery.trim().toLowerCase();
  const categories = q
    ? filtered
        .map(cat => ({
          ...cat,
          items: cat.items.filter(item => item.name.toLowerCase().includes(q) || tt(item.name).toLowerCase().includes(q)),
        }))
        .filter(cat => cat.items.length > 0)
    : filtered;

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
      {/* Clinic info */}
      <div className="bg-white rounded-2xl p-4 mb-4 border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-500">{tt(clinic.address)}</p>
        <p className="text-sm text-slate-500">{clinic.phone}</p>
        {clinic.note && (
          <p className="text-xs text-amber-600 mt-1 bg-amber-50 rounded-lg px-2 py-1 inline-block">
            {tt(clinic.note)}
          </p>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder={t('search.placeholder')}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={inputValue}
        onChange={handleChange}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={handleCompositionEnd}
      />

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              effectiveFilter === f.key
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category sections */}
      {categories.length === 0 ? (
        <p className="text-center text-slate-400 py-8">{t('common.noResults')}</p>
      ) : (
        categories.map((cat, ci) => (
          <CategorySection
            key={`${clinic.id}-${ci}`}
            category={cat}
            clinicName={clinic.name}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        ))
      )}
    </div>
  );
}

function CategorySection({
  category,
  clinicName,
  toggleCompare,
  isChecked,
}: {
  category: Category;
  clinicName: string;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { t, tt } = useI18n();
  const tag = category.tag;
  const tagCfg = tag ? TAG_CONFIG[tag] : null;

  const grouped = useMemo(() => groupItems(category.items), [category.items]);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-slate-700">{tt(category.name)}</h3>
        {tagCfg && tag && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${tagCfg.bg} ${tagCfg.color} font-semibold`}>
            {t('tag.' + tag)}
          </span>
        )}
      </div>

      {/* Grouped treatments */}
      {grouped.groups.length > 0 && (
        <div className="space-y-2 mb-3">
          {grouped.groups.map((group) => (
            <TreatmentGroup
              key={group.baseName}
              baseName={group.baseName}
              items={group.items}
              clinicName={clinicName}
              categoryName={category.name}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          ))}
        </div>
      )}

      {/* Single treatments */}
      {grouped.singles.length > 0 && (
        <ItemTable
          items={grouped.singles}
          clinicName={clinicName}
          categoryName={category.name}
          toggleCompare={toggleCompare}
          isChecked={isChecked}
        />
      )}

      {/* Set menus */}
      {grouped.sets.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            {t('group.setMenu')}
          </p>
          <ItemTable
            items={grouped.sets}
            clinicName={clinicName}
            categoryName={category.name}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        </div>
      )}
    </div>
  );
}

function TreatmentGroup({
  baseName,
  items,
  clinicName,
  categoryName,
  toggleCompare,
  isChecked,
}: {
  baseName: string;
  items: (TreatmentItem & { quantity: number | null; unit: string | null })[];
  clinicName: string;
  categoryName: string;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { t, tt, fmtPrice } = useI18n();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{tt(baseName)}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {t('group.options', { count: String(items.length) })}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {/* Variants */}
      {expanded && (
        <div className="divide-y divide-slate-100">
          {items.map((item, i) => {
            const bestPrice = item.event ?? item.base ?? item.orig;
            const compareItem: CompareItem = {
              clinicName,
              itemName: item.name,
              price: bestPrice ?? 0,
              categoryName,
            };
            const checked = isChecked(compareItem);
            const discount =
              item.orig && item.event
                ? Math.round((1 - item.event / item.orig) * 100)
                : null;
            const label = item.quantity != null && item.unit
              ? `${item.quantity.toLocaleString()}${tt(item.unit)}`
              : tt(item.name);
            const unitInfo = parseUnit(item.name);

            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-600">{label}</span>
                  {item.quantity == null && (
                    <span className="text-xs text-slate-400 ml-1">({tt(item.name)})</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.orig != null && item.event != null && (
                    <span className="text-xs text-slate-400 line-through">{fmtPrice(item.orig)}</span>
                  )}
                  {item.event != null ? (
                    <div className="text-right">
                      <span className="text-sm font-semibold text-rose-600">
                        {fmtPrice(item.event)}
                        {discount != null && discount > 0 && (
                          <span className="ml-1 text-[10px] text-rose-400">-{discount}%</span>
                        )}
                      </span>
                      {unitInfo && item.event > 0 && (
                        <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(item.event / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                      )}
                    </div>
                  ) : item.base != null ? (
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-700">{fmtPrice(item.base)}</span>
                      {unitInfo && item.base > 0 && (
                        <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(item.base / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                      )}
                    </div>
                  ) : item.orig != null ? (
                    <span className="text-sm text-slate-500">{fmtPrice(item.orig)}</span>
                  ) : null}
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCompare(compareItem)}
                    className="w-4 h-4 accent-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemTable({
  items,
  clinicName,
  categoryName,
  toggleCompare,
  isChecked,
}: {
  items: TreatmentItem[];
  clinicName: string;
  categoryName: string;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { t, tt, fmtPrice } = useI18n();
  const hasBase = items.some(i => i.base != null);
  const hasEvent = items.some(i => i.event != null);
  const hasOrig = items.some(i => i.orig != null);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs">
            <th className="text-left px-3 py-2 font-medium">{t('table.name')}</th>
            {hasOrig && <th className="text-right px-3 py-2 font-medium whitespace-nowrap">{t('table.original')}</th>}
            {hasEvent && <th className="text-right px-3 py-2 font-medium whitespace-nowrap">{t('table.event')}</th>}
            {hasBase && <th className="text-right px-3 py-2 font-medium whitespace-nowrap">{t('table.base')}</th>}
            <th className="w-10 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const bestPrice = item.event ?? item.base ?? item.orig;
            const compareItem: CompareItem = {
              clinicName,
              itemName: item.name,
              price: bestPrice ?? 0,
              categoryName,
            };
            const checked = isChecked(compareItem);
            const discount =
              item.orig && item.event
                ? Math.round((1 - item.event / item.orig) * 100)
                : null;
            const unitInfo = parseUnit(item.name);

            return (
              <tr
                key={i}
                className="border-t border-slate-100 hover:bg-slate-50 transition"
              >
                <td className="px-3 py-2 text-slate-700">{tt(item.name)}</td>
                {hasOrig && (
                  <td className="text-right px-3 py-2 text-slate-400 line-through text-xs whitespace-nowrap">
                    {fmtPrice(item.orig)}
                  </td>
                )}
                {hasEvent && (
                  <td className="text-right px-3 py-2 whitespace-nowrap">
                    <span className="font-semibold text-rose-600">
                      {fmtPrice(item.event)}
                      {discount != null && discount > 0 && (
                        <span className="ml-1 text-[10px] text-rose-400">-{discount}%</span>
                      )}
                    </span>
                    {unitInfo && item.event != null && item.event > 0 && (
                      <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(item.event / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                    )}
                  </td>
                )}
                {hasBase && (
                  <td className="text-right px-3 py-2 whitespace-nowrap">
                    <span className="font-medium text-slate-700">{fmtPrice(item.base)}</span>
                    {unitInfo && item.base != null && item.base > 0 && (
                      <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(item.base / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                    )}
                  </td>
                )}
                <td className="text-center px-2 py-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCompare(compareItem)}
                    className="w-4 h-4 accent-slate-700 cursor-pointer"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
