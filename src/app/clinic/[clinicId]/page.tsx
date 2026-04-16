'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchClinicDetail } from '@/lib/fetch-featured';
import type { ClinicDetail, CategoryDetail, TreatmentDetail } from '@/lib/fetch-featured';
import { useI18n } from '@/context/I18nContext';
import LangCurrencySelector from '@/components/LangCurrencySelector';

const TAG_LABELS: Record<string, { label: string; color: string }> = {
  first: { label: '첫방문', color: 'bg-emerald-100 text-emerald-700' },
  event: { label: '이벤트', color: 'bg-pink-100 text-pink-700' },
  lifting: { label: '리프팅', color: 'bg-violet-100 text-violet-700' },
  botox: { label: '보톡스', color: 'bg-blue-100 text-blue-700' },
  filler: { label: '필러', color: 'bg-indigo-100 text-indigo-700' },
  skin: { label: '피부', color: 'bg-sky-100 text-sky-700' },
  body: { label: '바디', color: 'bg-orange-100 text-orange-700' },
  hair_removal: { label: '제모', color: 'bg-amber-100 text-amber-700' },
  new: { label: 'NEW', color: 'bg-rose-100 text-rose-700' },
  best: { label: 'BEST', color: 'bg-yellow-100 text-yellow-700' },
  hot: { label: 'HOT', color: 'bg-red-100 text-red-700' },
  weekday: { label: '평일', color: 'bg-teal-100 text-teal-700' },
};

function fmtWon(n: number | null): string {
  if (!n) return '-';
  return `₩${n.toLocaleString()}`;
}

function discountPct(orig: number | null, event: number | null): number | null {
  if (!orig || !event || orig <= event) return null;
  return Math.round(((orig - event) / orig) * 100);
}

export default function ClinicPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;
  const { fmtPrice, currency, rateLabel } = useI18n();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!clinicId) return;
    fetchClinicDetail(clinicId)
      .then((d) => {
        setClinic(d);
        if (d) setExpandedCat(new Set(d.categories.map((c) => c.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

  const allTags = useMemo(() => {
    if (!clinic) return [];
    const tags = new Set<string>();
    for (const cat of clinic.categories) {
      if (cat.tag) tags.add(cat.tag);
    }
    return [...tags];
  }, [clinic]);

  const filteredCategories = useMemo(() => {
    if (!clinic) return [];
    let cats = clinic.categories;
    if (activeTag) cats = cats.filter((c) => c.tag === activeTag);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      cats = cats
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((t) => t.name.toLowerCase().includes(q)),
        }))
        .filter((cat) => cat.items.length > 0);
    }
    return cats;
  }, [clinic, activeTag, search]);

  const totalItems = filteredCategories.reduce((sum, c) => sum + c.items.length, 0);

  const toggleCat = (id: number) => {
    setExpandedCat((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--text-muted)]">클리닉을 찾을 수 없습니다</p>
        <Link href="/compare" className="text-[var(--primary)] font-semibold hover:underline">← 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/compare" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{clinic.name}</h1>
            {rateLabel && (
              <p className="text-[10px] text-[var(--text-light)] truncate">{rateLabel}</p>
            )}
          </div>
          <LangCurrencySelector />
          <Link href="/explore" className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors font-medium">
            🗺️ 지도
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Clinic info */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-extrabold mb-2">{clinic.name}</h2>
              {clinic.address && (
                <p className="text-sm text-[var(--text-muted)] mb-1">📍 {clinic.address}</p>
              )}
              {clinic.phone && (
                <p className="text-sm text-[var(--text-muted)] mb-1">
                  📞 <a href={`tel:${clinic.phone.replace(/[^0-9]/g, '')}`} className="text-[var(--primary)] hover:underline">{clinic.phone}</a>
                </p>
              )}
              {clinic.note && (
                <p className="text-xs text-[var(--text-light)] mt-2 leading-relaxed">{clinic.note}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 text-xs text-[var(--text-muted)]">
            <span className="bg-[var(--primary-soft)] text-[var(--primary)] font-semibold px-2.5 py-1 rounded-lg">
              {clinic.categories.length}개 카테고리
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
              {clinic.categories.reduce((s, c) => s + c.items.length, 0)}개 시술
            </span>
          </div>
        </div>

        {/* Search + tag filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-light)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="시술명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)] transition-all"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTag(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !activeTag
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'bg-slate-100 text-[var(--text-muted)] hover:bg-slate-200'
                }`}
              >
                전체 ({totalItems})
              </button>
              {allTags.map((tag) => {
                const cfg = TAG_LABELS[tag] || { label: tag, color: 'bg-slate-100 text-slate-700' };
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeTag === tag
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : `${cfg.color} hover:opacity-80`
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Categories + treatments */}
        <div className="space-y-4">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-light)] text-sm">
              검색 결과가 없습니다
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {cat.tag && TAG_LABELS[cat.tag] && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TAG_LABELS[cat.tag].color}`}>
                        {TAG_LABELS[cat.tag].label}
                      </span>
                    )}
                    <span className="font-bold text-sm">{cat.name}</span>
                    <span className="text-xs text-[var(--text-light)]">{cat.items.length}개</span>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-[var(--text-light)] transition-transform ${expandedCat.has(cat.id) ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {expandedCat.has(cat.id) && (
                  <div className="border-t border-[var(--border)]">
                    {cat.items.map((item, idx) => (
                      <TreatmentRow key={item.id} item={item} isLast={idx === cat.items.length - 1} fmtPrice={fmtPrice} />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TreatmentRow({ item, isLast, fmtPrice }: { item: TreatmentDetail; isLast: boolean; fmtPrice: (n: number | null | undefined) => string }) {
  const disc = discountPct(item.orig_price, item.event_price);

  return (
    <div className={`px-4 py-3 flex items-center justify-between gap-4 ${!isLast ? 'border-b border-[var(--border-soft)]' : ''} hover:bg-slate-50/50 transition-colors`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text)] leading-snug">
          {item.name}
          {item.volume_or_count && (
            <span className="text-[var(--text-light)] ml-1 text-xs">{item.volume_or_count}</span>
          )}
        </div>
        {item.area && (
          <span className="text-xs text-[var(--text-light)]">{item.area}</span>
        )}
      </div>

      <div className="text-right shrink-0">
        {item.event_price ? (
          <div>
            <div className="flex items-center gap-2 justify-end">
              {disc && (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                  -{disc}%
                </span>
              )}
              <span className="text-sm font-bold text-[var(--primary)]">{fmtPrice(item.event_price)}</span>
            </div>
            {item.orig_price && item.orig_price !== item.event_price && (
              <span className="text-xs text-[var(--text-light)] line-through">{fmtPrice(item.orig_price)}</span>
            )}
          </div>
        ) : item.orig_price ? (
          <span className="text-sm font-bold text-[var(--text)]">{fmtPrice(item.orig_price)}</span>
        ) : (
          <span className="text-xs text-[var(--text-light)]">가격문의</span>
        )}
      </div>
    </div>
  );
}
