'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { HiraClinic } from '@/types/hira';
import { GU_LIST } from '@/types/hira';

const MapInner = dynamic(() => import('@/components/map/MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
    </div>
  ),
});

export default function ExplorePage() {
  const [clinics, setClinics] = useState<HiraClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGu, setSelectedGu] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch('/data/seoul_derma.json')
      .then((r) => r.json())
      .then((data: HiraClinic[]) => {
        setClinics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const guCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clinics) m.set(c.gu, (m.get(c.gu) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [clinics]);

  const filtered = useMemo(() => {
    let list = clinics;
    if (selectedGu) list = list.filter((c) => c.gu === selectedGu);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.addr.toLowerCase().includes(q)
      );
    }
    return list;
  }, [clinics, selectedGu, search]);

  const visibleList = useMemo(() => filtered.slice(0, 200), [filtered]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="glass border-b border-[var(--border)] px-4 h-14 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-lg">💎</span>
            <span className="font-bold text-sm gradient-brand-text hidden sm:inline">Seoul Beauty</span>
          </Link>
          <span className="text-[var(--border)]">|</span>
          <span className="text-sm font-semibold text-[var(--text)]">탐색</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-medium px-2.5 py-1 bg-[var(--primary-soft)] text-[var(--primary)] rounded-full">
            {filtered.length.toLocaleString()}곳
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sm:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
            absolute sm:relative z-30 w-[340px] sm:w-[360px] h-full
            bg-white border-r border-[var(--border)]
            flex flex-col transition-transform duration-300 shrink-0
          `}
        >
          {/* Search */}
          <div className="p-4 border-b border-[var(--border)] space-y-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-light)]"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="의원명 또는 주소 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)] transition-all"
              />
            </div>

            {/* Gu filter */}
            <select
              value={selectedGu || ''}
              onChange={(e) => setSelectedGu(e.target.value || null)}
              className="w-full px-3 py-2 bg-white border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:border-[var(--primary)] transition-all cursor-pointer"
            >
              <option value="">전체 자치구</option>
              {guCounts.map(([gu, count]) => (
                <option key={gu} value={gu}>
                  {gu} ({count.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Clinic list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-[var(--text-light)] text-sm py-16">
                결과가 없습니다
              </div>
            ) : (
              <div className="p-2">
                {visibleList.map((c) => (
                  <ClinicListItem key={c.id} clinic={c} />
                ))}
                {filtered.length > 200 && (
                  <div className="text-center text-xs text-[var(--text-light)] py-4">
                    외 {(filtered.length - 200).toLocaleString()}곳 — 지도에서 확인
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 h-full">
          {!loading && (
            <MapInner
              clinics={filtered}
              selectedGu={selectedGu}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ClinicListItem({ clinic }: { clinic: HiraClinic }) {
  return (
    <div className="p-3 rounded-xl hover:bg-[var(--primary-soft)] cursor-pointer transition-colors mb-1 group border border-transparent hover:border-indigo-200">
      <div className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-snug">
        {clinic.name}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-[var(--text-muted)] rounded group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
          {clinic.gu}
        </span>
        <span className="text-xs text-[var(--text-light)] truncate">{clinic.addr}</span>
      </div>
      {clinic.homepage && (
        <div className="mt-1.5">
          <a
            href={clinic.homepage}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[var(--primary)] hover:underline font-medium"
          >
            🌐 홈페이지
          </a>
        </div>
      )}
    </div>
  );
}
