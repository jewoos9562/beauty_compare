'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { FeaturedClinic } from '@/lib/fetch-featured';
import { fetchAllFeatured } from '@/lib/fetch-featured';
import LangCurrencySelector from '@/components/LangCurrencySelector';

const DISTRICT_NAMES: Record<string, string> = {
  gangnam: '강남구', seocho: '서초구', songpa: '송파구', mapo: '마포구',
  jung: '중구', gangseo: '강서구', gwangjin: '광진구', yeongdeungpo: '영등포구',
  gangdong: '강동구', nowon: '노원구', dongdaemun: '동대문구', seongdong: '성동구',
  guro: '구로구', yongsan: '용산구', yangcheon: '양천구', seodaemun: '서대문구',
  dobong: '도봉구', gwanak: '관악구', gangbuk: '강북구',
};

function getChainKey(id: string): string {
  return id.split('_')[0];
}

const CHAIN_COLORS: Record<string, string> = {
  toxnfill: 'bg-violet-500', uni: 'bg-emerald-500', daybeau: 'bg-orange-500',
  vands: 'bg-blue-500', ppeum: 'bg-pink-500', drevers: 'bg-amber-500',
  evers: 'bg-amber-500', blivi: 'bg-rose-500',
};

function fmtPrice(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}만원`;
  return `${n.toLocaleString()}원`;
}

export default function ComparePage() {
  const [clinics, setClinics] = useState<FeaturedClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllFeatured()
      .then(setClinics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const districts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clinics) m.set(c.district_id, (m.get(c.district_id) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [clinics]);

  const filtered = useMemo(() => {
    let list = clinics;
    if (selectedDistrict) list = list.filter((c) => c.district_id === selectedDistrict);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [clinics, selectedDistrict, search]);

  const chains = useMemo(() => {
    const m = new Map<string, FeaturedClinic[]>();
    for (const c of filtered) {
      const key = getChainKey(c.id);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-lg">💎</span>
              <span className="font-bold text-sm gradient-brand-text hidden sm:inline">En beauté</span>
            </Link>
            <span className="text-[var(--border)]">|</span>
            <span className="text-sm font-semibold">가격 비교</span>
          </div>
          <div className="flex items-center gap-2">
            <LangCurrencySelector />
            <Link href="/explore" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors font-medium">
              🗺️ 지도
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            시술 <span className="gradient-brand-text">가격 비교</span>
          </h1>
          <p className="text-[var(--text-muted)]">
            {clinics.length}개 클리닉의 시술 가격을 비교해보세요
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-light)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="클리닉명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)] transition-all"
            />
          </div>
          <select
            value={selectedDistrict || ''}
            onChange={(e) => setSelectedDistrict(e.target.value || null)}
            className="px-4 py-2.5 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)] transition-all cursor-pointer"
          >
            <option value="">전체 자치구</option>
            {districts.map(([d, cnt]) => (
              <option key={d} value={d}>{DISTRICT_NAMES[d] || d} ({cnt})</option>
            ))}
          </select>
        </div>

        {/* Clinics grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            {chains.map(([chain, chainClinics]) => (
              <div key={chain}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${CHAIN_COLORS[chain] || 'bg-slate-400'}`} />
                  <h2 className="text-lg font-bold capitalize">{chain}</h2>
                  <span className="text-xs text-[var(--text-muted)] bg-slate-100 px-2 py-0.5 rounded-full">
                    {chainClinics.length}개 지점
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chainClinics.map((c) => (
                    <Link
                      key={c.id}
                      href={`/clinic/${c.id}`}
                      className="group block bg-white rounded-2xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-base group-hover:text-[var(--primary)] transition-colors">
                            {c.name}
                          </h3>
                          <span className="text-xs text-[var(--text-muted)]">
                            {DISTRICT_NAMES[c.district_id] || c.district_id}
                          </span>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${CHAIN_COLORS[chain] || 'bg-slate-400'}`} />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3">
                        <span>{c.categoryCount}개 카테고리</span>
                        <span>·</span>
                        <span>{c.treatmentCount}개 시술</span>
                      </div>

                      {c.priceRange && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--primary)] bg-[var(--primary-soft)] px-2.5 py-1 rounded-lg">
                            💰 {fmtPrice(c.priceRange.min)} ~ {fmtPrice(c.priceRange.max)}
                          </span>
                        </div>
                      )}

                      <div className="mt-3 text-xs text-[var(--primary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        가격 보기 →
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
