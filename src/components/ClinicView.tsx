'use client';

import { useState, useRef, useCallback } from 'react';
import type { Clinic, Category } from '@/data/clinics';
import { TAG_CONFIG } from '@/data/clinics';
import type { CompareItem } from '@/app/page';

function fmt(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString() + '원';
}

type Props = {
  clinic: Clinic;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
};

export default function ClinicView({ clinic, toggleCompare, isChecked }: Props) {
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

  const allFilters = [
    { key: 'first', label: '첫방문' },
    { key: 'event', label: '이벤트' },
    { key: 'hot', label: '핫딜' },
    { key: 'weekday', label: '화수목' },
    { key: 'best', label: 'BEST' },
    { key: 'new', label: 'NEW' },
    { key: 'botox', label: '보톡스' },
    { key: 'filler', label: '필러' },
    { key: 'lifting', label: '리프팅' },
    { key: 'skinbooster', label: '스킨부스터' },
    { key: 'laser', label: '레이저' },
    { key: 'hair_removal', label: '제모' },
    { key: 'skincare', label: '스킨케어' },
    { key: 'body', label: '바디' },
    { key: 'neck', label: '목라인' },
    { key: 'male', label: '남성' },
  ];

  const filters = [
    { key: 'all', label: '전체' },
    ...allFilters.filter(f => clinicTags.has(f.key)),
  ];
  if (hasBase) filters.push({ key: 'base', label: '일반' });

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
          items: cat.items.filter(item => item.name.toLowerCase().includes(q)),
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
        <p className="text-sm text-slate-500">{clinic.address}</p>
        <p className="text-sm text-slate-500">{clinic.phone}</p>
        {clinic.note && (
          <p className="text-xs text-amber-600 mt-1 bg-amber-50 rounded-lg px-2 py-1 inline-block">
            {clinic.note}
          </p>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="시술명 검색..."
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

      {/* Category tables */}
      {categories.length === 0 ? (
        <p className="text-center text-slate-400 py-8">검색 결과가 없습니다</p>
      ) : (
        categories.map((cat, ci) => (
          <CategoryTable
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

function CategoryTable({
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
  const tag = category.tag;
  const tagCfg = tag ? TAG_CONFIG[tag] : null;
  const hasBase = category.items.some(i => i.base != null);
  const hasEvent = category.items.some(i => i.event != null);
  const hasOrig = category.items.some(i => i.orig != null);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-slate-700">{category.name}</h3>
        {tagCfg && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${tagCfg.bg} ${tagCfg.color} font-semibold`}>
            {tagCfg.label}
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs">
              <th className="text-left px-3 py-2 font-medium">시술명</th>
              {hasOrig && <th className="text-right px-3 py-2 font-medium whitespace-nowrap">정가</th>}
              {hasEvent && <th className="text-right px-3 py-2 font-medium whitespace-nowrap">이벤트가</th>}
              {hasBase && <th className="text-right px-3 py-2 font-medium whitespace-nowrap">기본가</th>}
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {category.items.map((item, i) => {
              const bestPrice = item.event ?? item.base ?? item.orig;
              const compareItem: CompareItem = {
                clinicName,
                itemName: item.name,
                price: bestPrice ?? 0,
                categoryName: category.name,
              };
              const checked = isChecked(compareItem);
              const discount =
                item.orig && item.event
                  ? Math.round((1 - item.event / item.orig) * 100)
                  : null;

              return (
                <tr
                  key={i}
                  className="border-t border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="px-3 py-2 text-slate-700">{item.name}</td>
                  {hasOrig && (
                    <td className="text-right px-3 py-2 text-slate-400 line-through text-xs whitespace-nowrap">
                      {fmt(item.orig)}
                    </td>
                  )}
                  {hasEvent && (
                    <td className="text-right px-3 py-2 font-semibold text-rose-600 whitespace-nowrap">
                      {fmt(item.event)}
                      {discount != null && discount > 0 && (
                        <span className="ml-1 text-[10px] text-rose-400">-{discount}%</span>
                      )}
                    </td>
                  )}
                  {hasBase && (
                    <td className="text-right px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                      {fmt(item.base)}
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
    </div>
  );
}
