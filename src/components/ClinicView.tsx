'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import type { Clinic, Category, TreatmentItem } from '@/data/clinics';
import { TAG_CONFIG } from '@/data/clinics';
import type { CompareItem } from '@/types/compare';
import { useI18n } from '@/context/I18nContext';
import { groupItems } from '@/lib/group-treatments';
import ReviewSummary from '@/components/ReviewSummary';
import reviewsData from '@/data/reviews.json';
import reviewsTranslated from '@/data/reviews-translated.json';

function parseUnit(name: string): { count: number; unit: string } | null {
  const shot = name.match(/(\d+)\s*샷/);
  if (shot && parseInt(shot[1]) > 1) return { count: parseInt(shot[1]), unit: '샷' };
  const cc = name.match(/(\d+)\s*cc/i);
  if (cc && parseInt(cc[1]) > 1) return { count: parseInt(cc[1]), unit: 'cc' };
  return null;
}

/** Parse notes field into clinic alias + origin + brand + extra */
function parseNotes(notes: string | null | undefined): {
  clinicAlias: string | null;
  origin: string | null;
  brand: string | null;
  extra: string | null;
} {
  if (!notes) return { clinicAlias: null, origin: null, brand: null, extra: null };

  let remaining = notes;
  let clinicAlias: string | null = null;

  // Extract [alias] prefix
  const aliasMatch = remaining.match(/^\[([^\]]+)\]\s*/);
  if (aliasMatch) {
    clinicAlias = aliasMatch[1];
    remaining = remaining.slice(aliasMatch[0].length);
  }

  const parts = remaining.split(',').map(p => p.trim()).filter(Boolean);
  let brand: string | null = null;
  let origin: string | null = null;
  const extras: string[] = [];

  const ORIGINS = ['국산', '미국산', '독일산', '수입산', '프랑스산', '스위스산', '일본산'];
  const BRANDS = ['뉴라미스','벨로테로','레스틸렌','아띠에르','쥬비덤','엘러간','제오민','코어톡스','디스포트','넥소좀','브라이톤','더마샤인','리투오'];

  for (const part of parts) {
    // "국산-아띠에르", "미국산-엘러간" etc.
    const dashMatch = part.match(/^(국산|수입산|미국산|독일산|프랑스산)-(.+)/);
    if (dashMatch) {
      origin = dashMatch[1];
      brand = dashMatch[2];
      continue;
    }
    if (ORIGINS.includes(part)) { origin = part; continue; }
    if (BRANDS.some(b => part.startsWith(b))) { brand = part; continue; }
    extras.push(part);
  }
  return { clinicAlias, origin, brand, extra: extras.length > 0 ? extras.join(', ') : null };
}

/** Render clinic alias + brand/origin badges */
function NoteBadges({ notes }: { notes: string | null | undefined }) {
  const { clinicAlias, origin, brand, extra } = parseNotes(notes);
  if (!clinicAlias && !brand && !origin && !extra) return null;
  return (
    <>
      {clinicAlias && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-medium border border-indigo-100">
          {clinicAlias}
        </span>
      )}
      {origin && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${
          origin === '국산'
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
            : 'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {origin}
        </span>
      )}
      {brand && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-medium border border-teal-100">
          {brand}
        </span>
      )}
      {extra && (
        <span className="text-[10px] text-slate-400">{extra}</span>
      )}
    </>
  );
}

type Props = {
  clinic: Clinic;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
  branchUrl?: string | null;
  chainColor?: string | null;
};

export default function ClinicView({ clinic, toggleCompare, isChecked, branchUrl, chainColor }: Props) {
  const { t, tt, lang } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const isComposing = useRef(false);

  const clinicTags = new Set<string>();
  let hasBase = false;
  clinic.categories.forEach(cat => {
    if (cat.tag) clinicTags.add(cat.tag);
    else hasBase = true;
  });

  const allFilterKeys = ['lifting','filler','botox','skin','body','hair_removal','prescription','certificate','unclassified','first','event','hot','weekday','best','new','skinbooster','laser','skincare','neck','male'];
  const allFilters = allFilterKeys.map(key => ({ key, label: TAG_CONFIG[key]?.label || key }));

  const filters = [
    { key: 'all', label: t('filter.all') },
    ...allFilters.filter(f => clinicTags.has(f.key)),
  ];
  if (hasBase) filters.push({ key: 'base', label: t('filter.base') });

  const effectiveFilter =
    filters.some(f => f.key === activeFilter) ? activeFilter : 'all';

  const filtered = clinic.categories.filter(cat => {
    if (effectiveFilter === 'all') return true;
    if (effectiveFilter === 'base') return cat.tag === null;
    return cat.tag === effectiveFilter;
  });

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
      {/* Clinic header */}
      <div className="bg-white rounded-xl mb-4 border border-slate-200/60 flex overflow-hidden shadow-sm">
        {/* Color accent bar */}
        <div className="w-2 shrink-0" style={{ backgroundColor: chainColor || '#94a3b8' }} />
        <div className="p-4 flex-1">
        <h2 className="text-base font-bold text-slate-800 mb-1">{tt(clinic.name)}</h2>
        <p className="text-sm text-slate-500">{tt(clinic.address)}</p>
        {clinic.phone && <p className="text-sm text-slate-400">{clinic.phone}</p>}
        {clinic.note && (
          <p className="text-xs text-amber-700 mt-2 bg-amber-50/80 rounded-lg px-2.5 py-1.5 inline-block border border-amber-100">
            {tt(clinic.note)}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          {branchUrl && (
            <a
              href={branchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition border border-slate-200/60"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              {t('common.officialSite')}
            </a>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.name + ' ' + clinic.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-xs font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition border border-slate-200/60"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {t('common.viewMapReviews')}
          </a>
        </div>
        </div>
      </div>

      {/* Review summary */}
      <ReviewSummary
        clinicId={clinic.id}
        clinicName={clinic.name}
        clinicAddress={clinic.address}
        reviewData={
          lang !== 'ko'
            ? (reviewsTranslated as Record<string, any>)[lang]?.[clinic.id]
              ?? (reviewsData as Record<string, any>)[clinic.id]
              ?? null
            : (reviewsData as Record<string, any>)[clinic.id] ?? null
        }
      />

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={t('search.placeholder')}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/60 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition"
          value={inputValue}
          onChange={handleChange}
          onCompositionStart={() => { isComposing.current = true; }}
          onCompositionEnd={handleCompositionEnd}
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              effectiveFilter === f.key
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-500 border border-slate-200/60 hover:border-slate-300 hover:text-slate-700'
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
            hasSearch={q.length > 0}
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
  hasSearch,
}: {
  category: Category;
  clinicName: string;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
  hasSearch?: boolean;
}) {
  const { t, tt } = useI18n();
  const tag = category.tag;
  const tagCfg = tag ? TAG_CONFIG[tag] : null;
  const [manualExpanded, setManualExpanded] = useState(false);
  // Search active → always expanded; no search → manual toggle (default collapsed)
  const expanded = hasSearch || manualExpanded;
  const [subFilters, setSubFilters] = useState<Set<string>>(new Set());
  const [purposeFilters, setPurposeFilters] = useState<Set<string>>(new Set());
  const [areaFilters, setAreaFilters] = useState<Set<string>>(new Set());
  const [genderFilter, setGenderFilter] = useState<string | null>(null);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  };

  // Collect unique sub-categories (중분류)
  const subCategories = useMemo(() => {
    const subs = new Map<string, number>();
    for (const item of category.items) {
      const sub = item.master_sub || '';
      if (sub) subs.set(sub, (subs.get(sub) || 0) + 1);
    }
    return subs;
  }, [category.items]);

  const hasSubs = subCategories.size > 0;

  // Gender detection for 제모 category
  const getGender = (item: TreatmentItem): string => {
    const text = ((item.notes || '') + ' ' + (item.area || '') + ' ' + (item.name || '')).toLowerCase();
    if (/남성|남자|male/.test(text)) return '남성';
    if (/여성|여자|female/.test(text)) return '여성';
    return '공통';
  };

  const genderCounts = useMemo(() => {
    if (tag !== 'hair_removal') return null;
    const counts: Record<string, number> = { '남성': 0, '여성': 0, '공통': 0 };
    for (const item of category.items) {
      counts[getGender(item)]++;
    }
    return (counts['남성'] > 0 || counts['여성'] > 0) ? counts : null;
  }, [category.items, tag]);

  // Apply all filters (AND between dimensions, OR within each)
  const filteredItems = useMemo(() => {
    return category.items.filter(item => {
      if (subFilters.size > 0 && !subFilters.has(item.master_sub || '')) return false;
      if (purposeFilters.size > 0) {
        const itemPurposes = item.purpose?.split('/').map(p => p.trim()) || [];
        if (!itemPurposes.some(p => purposeFilters.has(p))) return false;
      }
      if (areaFilters.size > 0 && !areaFilters.has(item.area || '')) return false;
      if (genderFilter && getGender(item) !== genderFilter) return false;
      return true;
    });
  }, [category.items, subFilters, purposeFilters, areaFilters, genderFilter]);

  // Scoped items (after sub filter) for deriving purpose/area options
  const scopedItems = useMemo(() => {
    return subFilters.size > 0
      ? category.items.filter(item => subFilters.has(item.master_sub || ''))
      : category.items;
  }, [category.items, subFilters]);

  // Purpose keywords scoped to sub selection
  const purposeKeywords = useMemo(() => {
    const kws = new Set<string>();
    for (const item of scopedItems) {
      if (item.purpose) {
        for (const p of item.purpose.split('/')) {
          const trimmed = p.trim();
          if (trimmed) kws.add(trimmed);
        }
      }
    }
    return [...kws].sort();
  }, [scopedItems]);

  // Area keywords scoped to sub + purpose selection
  const areaKeywords = useMemo(() => {
    let items = scopedItems;
    if (purposeFilters.size > 0) {
      items = items.filter(item => {
        const ps = item.purpose?.split('/').map(p => p.trim()) || [];
        return ps.some(p => purposeFilters.has(p));
      });
    }
    const areas = new Map<string, number>();
    for (const item of items) {
      const a = item.area || '';
      if (a) areas.set(a, (areas.get(a) || 0) + 1);
    }
    return areas;
  }, [scopedItems, purposeFilters]);

  // Show filter rows when there's at least 1 option
  const showPurposeFilter = purposeKeywords.length > 0;
  const showAreaFilter = areaKeywords.size > 1;

  // Reset invalid filters when scope changes
  useMemo(() => {
    if (purposeFilters.size > 0) {
      const valid = new Set(purposeKeywords);
      const invalid = [...purposeFilters].filter(p => !valid.has(p));
      if (invalid.length > 0) setPurposeFilters(prev => { const n = new Set(prev); invalid.forEach(p => n.delete(p)); return n; });
    }
  }, [purposeKeywords]);
  useMemo(() => {
    if (areaFilters.size > 0) {
      const invalid = [...areaFilters].filter(a => !areaKeywords.has(a));
      if (invalid.length > 0) setAreaFilters(prev => { const n = new Set(prev); invalid.forEach(a => n.delete(a)); return n; });
    }
  }, [areaKeywords]);

  // Group filtered items by master_sub (중분류) for display
  const subGroups = useMemo(() => {
    const map = new Map<string, TreatmentItem[]>();
    for (const item of filteredItems) {
      const sub = item.master_sub || '기타';
      if (!map.has(sub)) map.set(sub, []);
      map.get(sub)!.push(item);
    }
    return map;
  }, [filteredItems]);

  // Show grouped when multiple subs visible and not filtering to specific subs
  const showGrouped = subFilters.size !== 1 && (subGroups.size > 1 || (subGroups.size === 1 && !subGroups.has('기타')));

  return (
    <div className={`mb-3 rounded-xl border transition-colors ${expanded ? 'border-slate-200/60 bg-white shadow-sm' : 'border-slate-100 bg-slate-50/50'}`}>
      <button
        onClick={() => setManualExpanded(!manualExpanded)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left group rounded-xl transition ${!expanded ? 'hover:bg-slate-100/70' : ''}`}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-slate-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <h3 className={`text-sm font-bold ${expanded ? 'text-slate-800' : 'text-slate-500'}`}>{tt(category.name)}</h3>
        {tagCfg && tag && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${tagCfg.bg} ${tagCfg.color} font-semibold`}>
            {tagCfg.label}
          </span>
        )}
        <span className="text-[10px] text-slate-400">{filteredItems.length}개</span>
      </button>

      {expanded && <div className="px-3 pb-3">
        {/* Filter rows */}
        {(hasSubs || showPurposeFilter || showAreaFilter || genderCounts) && (
          <div className="ml-5 mb-2 space-y-1.5">
            {/* 성별 filter row (제모 only) */}
            {genderCounts && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-[10px] text-pink-500 font-medium mr-1 shrink-0">성별</span>
                {([null, '남성', '여성', '공통'] as const).map(g => {
                  const label = g === null ? '전체' : g;
                  const count = g === null ? category.items.length : genderCounts[g];
                  if (g !== null && count === 0) return null;
                  return (
                    <button
                      key={label}
                      onClick={() => setGenderFilter(g)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                        genderFilter === g
                          ? 'bg-pink-600 text-white border-pink-600'
                          : 'bg-white text-pink-700 border-pink-200 hover:border-pink-400'
                      }`}
                    >
                      {label} {g !== null && <span className="opacity-60">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {/* 중분류 filter row */}
            {hasSubs && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-[10px] text-slate-400 font-medium mr-1 shrink-0">분류</span>
                <button
                  onClick={() => setSubFilters(new Set())}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                    subFilters.size === 0
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  전체
                </button>
                {[...subCategories.entries()].map(([sub, count]) => (
                  <button
                    key={sub}
                    onClick={() => toggleSet(setSubFilters, sub)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                      subFilters.has(sub)
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {sub} <span className="opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            )}
            {/* 목적 keyword filter row */}
            {showPurposeFilter && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-[10px] text-slate-400 font-medium mr-1 shrink-0">목적</span>
                <button
                  onClick={() => setPurposeFilters(new Set())}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition ${
                    purposeFilters.size === 0
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                  }`}
                >
                  전체
                </button>
                {purposeKeywords.map(kw => (
                  <button
                    key={kw}
                    onClick={() => toggleSet(setPurposeFilters, kw)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition ${
                      purposeFilters.has(kw)
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}
            {/* 부위 filter row */}
            {showAreaFilter && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-[10px] text-amber-600 font-medium mr-1 shrink-0">부위</span>
                <button
                  onClick={() => setAreaFilters(new Set())}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                    areaFilters.size === 0
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  전체
                </button>
                {[...areaKeywords.entries()].map(([area, count]) => (
                  <button
                    key={area}
                    onClick={() => toggleSet(setAreaFilters, area)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition border ${
                      areaFilters.has(area)
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-700 border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    {area} <span className="opacity-60">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Items display */}
        {showGrouped ? (
          <div className="space-y-2">
            {[...subGroups.entries()].map(([subName, items]) => (
              <SubCategoryGroup
                key={subName}
                subName={subName}
                items={items}
                clinicName={clinicName}
                categoryName={category.name}
                toggleCompare={toggleCompare}
                isChecked={isChecked}
              />
            ))}
          </div>
        ) : (
          <FlatItemList
            items={filteredItems}
            clinicName={clinicName}
            categoryName={category.name}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        )}
      </div>}
    </div>
  );
}

/** 중분류 접이식 그룹 */
function SubCategoryGroup({
  subName,
  items,
  clinicName,
  categoryName,
  toggleCompare,
  isChecked,
}: {
  subName: string;
  items: TreatmentItem[];
  clinicName: string;
  categoryName: string;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { tt } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const grouped = useMemo(() => groupItems(items), [items]);

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/50 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">{tt(subName)}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {items.length}개
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {expanded && (
        <div className="divide-y divide-slate-100/80">
          {grouped.groups.map((group) => (
            <TreatmentGroup
              key={group.baseName}
              baseName={group.baseName}
              items={group.items}
              clinicName={clinicName}
              categoryName={categoryName}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          ))}
          {grouped.singles.map((item, i) => (
            <TreatmentRow
              key={`s-${i}`}
              item={item}
              clinicName={clinicName}
              categoryName={categoryName}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          ))}
          {grouped.sets.map((item, i) => (
            <TreatmentRow
              key={`set-${i}`}
              item={item}
              clinicName={clinicName}
              categoryName={categoryName}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Flat list (no sub-categories) using groupItems for quantity grouping */
function FlatItemList({
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
  const { t, tt } = useI18n();
  const grouped = useMemo(() => groupItems(items), [items]);

  return (
    <>
      {grouped.groups.length > 0 && (
        <div className="space-y-2 mb-3">
          {grouped.groups.map((group) => (
            <TreatmentGroup
              key={group.baseName}
              baseName={group.baseName}
              items={group.items}
              clinicName={clinicName}
              categoryName={categoryName}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          ))}
        </div>
      )}

      {grouped.singles.length > 0 && (
        <ItemTable
          items={grouped.singles}
          clinicName={clinicName}
          categoryName={categoryName}
          toggleCompare={toggleCompare}
          isChecked={isChecked}
        />
      )}

      {grouped.sets.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            {t('group.setMenu')}
          </p>
          <ItemTable
            items={grouped.sets}
            clinicName={clinicName}
            categoryName={categoryName}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        </div>
      )}
    </>
  );
}

/** Single treatment row with v2 metadata */
function TreatmentRow({
  item,
  clinicName,
  categoryName,
  toggleCompare,
  isChecked,
}: {
  item: TreatmentItem;
  clinicName: string;
  categoryName: string;
  toggleCompare: (item: CompareItem) => void;
  isChecked: (item: CompareItem) => boolean;
}) {
  const { tt, fmtPrice } = useI18n();
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

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50/50 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm text-slate-700">
            {tt(item.name)}{item.volume_or_count ? ` ${item.volume_or_count}` : ''}
          </span>
          {item.area && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-100">
              {item.area}
            </span>
          )}
          {item.promo && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 font-medium border border-rose-100">
              {item.promo}
            </span>
          )}
          <NoteBadges notes={item.notes} />
        </div>
        {item.purpose && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {item.purpose.split('/').map((p, i) => (
              <span key={i} className="text-[10px] px-1 py-0.5 rounded text-sky-500">
                #{p.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {item.orig != null && item.event != null && (
          <span className="text-xs text-slate-300 line-through">{fmtPrice(item.orig)}</span>
        )}
        {item.event != null ? (
          <span className="text-sm font-semibold text-sky-600">
            {fmtPrice(item.event)}
            {discount != null && discount > 0 && (
              <span className="ml-1 text-[10px] font-bold text-rose-500">-{discount}%</span>
            )}
          </span>
        ) : item.base != null ? (
          <span className="text-sm font-medium text-slate-700">{fmtPrice(item.base)}</span>
        ) : item.orig != null ? (
          <span className="text-sm text-slate-500">{fmtPrice(item.orig)}</span>
        ) : (
          <span className="text-xs text-slate-300">가격문의</span>
        )}
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleCompare(compareItem)}
          className="w-4 h-4 cursor-pointer rounded"
        />
      </div>
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
    <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/50 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{tt(baseName)}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {t('group.options', { count: String(items.length) })}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {expanded && (
        <div className="divide-y divide-slate-100/80">
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

            // Build display label: name + volume/count inline
            const volLabel = item.volume_or_count || (item.quantity != null && item.unit ? `${item.quantity}${item.unit}` : null);
            const displayName = `${tt(item.name)}${volLabel ? ` ${volLabel}` : ''}`;

            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50/50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm text-slate-700">{displayName}</span>
                    {item.area && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-100">
                        {item.area}
                      </span>
                    )}
                    {item.promo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 font-medium border border-rose-100">
                        {item.promo}
                      </span>
                    )}
                    <NoteBadges notes={item.notes} />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.orig != null && item.event != null && (
                    <span className="text-xs text-slate-300 line-through">{fmtPrice(item.orig)}</span>
                  )}
                  {item.event != null ? (
                    <div className="text-right">
                      <span className="text-sm font-semibold text-sky-600">
                        {fmtPrice(item.event)}
                        {discount != null && discount > 0 && (
                          <span className="ml-1 text-[10px] font-bold text-rose-500">-{discount}%</span>
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
                    className="w-4 h-4 cursor-pointer rounded"
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
    <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50/80 text-slate-400 text-xs">
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
                className="border-t border-slate-100/80 hover:bg-slate-50/50 transition"
              >
                <td className="px-3 py-2.5 text-slate-700">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{tt(item.name)}{item.volume_or_count ? ` ${item.volume_or_count}` : ''}</span>
                    {item.area && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-100">
                        {item.area}
                      </span>
                    )}
                    {item.promo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 font-medium border border-rose-100">
                        {item.promo}
                      </span>
                    )}
                    <NoteBadges notes={item.notes} />
                  </div>
                </td>
                {hasOrig && (
                  <td className="text-right px-3 py-2.5 text-slate-300 line-through text-xs whitespace-nowrap">
                    {fmtPrice(item.orig)}
                  </td>
                )}
                {hasEvent && (
                  <td className="text-right px-3 py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-sky-600">
                      {fmtPrice(item.event)}
                      {discount != null && discount > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-rose-500">-{discount}%</span>
                      )}
                    </span>
                    {unitInfo && item.event != null && item.event > 0 && (
                      <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(item.event / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                    )}
                  </td>
                )}
                {hasBase && (
                  <td className="text-right px-3 py-2.5 whitespace-nowrap">
                    <span className="font-medium text-slate-700">{fmtPrice(item.base)}</span>
                    {unitInfo && item.base != null && item.base > 0 && (
                      <p className="text-[10px] text-slate-400">{fmtPrice(Math.round(item.base / unitInfo.count))}/{tt(unitInfo.unit)}</p>
                    )}
                  </td>
                )}
                <td className="text-center px-2 py-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCompare(compareItem)}
                    className="w-4 h-4 cursor-pointer rounded"
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
