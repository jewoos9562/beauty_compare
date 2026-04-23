'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { classifySourceUrl, type SiteType } from '@/lib/chain-utils';

/* ─── Types ─── */
interface CrawlPageSummary {
  hira_id: string;
  clinic_name: string;
  pages: number;
  total_chars: number;
}

interface CrawlPageFull {
  id: number;
  url: string;
  raw_text: string;
  char_count: number;
}

interface ClinicCrawl {
  hira_id: string;
  clinic_name: string;
  gu: string;
  pages: number;
  totalChars: number;
  imageCount: number;
  isChain: boolean;
  homepage: string;
  siteType?: SiteType;
}

interface GuSummary {
  gu: string;
  clinics: ClinicCrawl[];
  totalPages: number;
  totalImages: number;
}

interface ChainCommon {
  clinic_name: string;
  hira_ids: string[];
  totalPages: number;
}

/* ─── Main Page ─── */
export default function AdminCrawlsPage() {
  const [pageSummaries, setPageSummaries] = useState<CrawlPageSummary[]>([]);
  const [imageCounts, setImageCounts] = useState<Record<string, number>>({});
  const [guMap, setGuMap] = useState<Record<string, string>>({});
  const [homepageMap, setHomepageMap] = useState<Record<string, string>>({});
  const [siteTypeMap, setSiteTypeMap] = useState<Record<string, SiteType>>({});
  const [chainCountMap, setChainCountMap] = useState<Record<string, number>>({});
  const [noOfficialMap, setNoOfficialMap] = useState<Record<string, { name: string; id: string }[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [selectedClinicName, setSelectedClinicName] = useState('');
  const [selectedMode, setSelectedMode] = useState<'all' | 'branch' | 'common'>('all');
  const [clinicPages, setClinicPages] = useState<CrawlPageFull[]>([]);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [expandedPageId, setExpandedPageId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('crawl_page_summary').select('*').then(r => r.data || []) as Promise<CrawlPageSummary[]>,
      supabase.from('crawl_image_summary').select('hira_id, total').then(r => r.data || []) as Promise<{ hira_id: string; total: number }[]>,
      fetch('/data/seoul_derma.json').then(r => r.json()),
    ]).then(([pages, images, clinicData]) => {
      setPageSummaries(pages);

      const imgMap: Record<string, number> = {};
      for (const img of images) imgMap[img.hira_id] = img.total;
      setImageCounts(imgMap);

      const gm: Record<string, string> = {};
      const hm: Record<string, string> = {};
      const stm: Record<string, SiteType> = {};
      const nameCount: Record<string, number> = {};
      const noOff: Record<string, { name: string; id: string }[]> = {};
      for (const c of clinicData) {
        if (c.id) {
          gm[c.id] = c.gu || '기타';
          if (c.homepage) hm[c.id] = c.homepage;
          if (c.site_type) stm[c.id] = c.site_type;
          if (c.homepage_status === 'no_official') {
            if (!noOff[c.gu]) noOff[c.gu] = [];
            noOff[c.gu].push({ name: c.name, id: c.id });
          }
        }
        nameCount[c.name] = (nameCount[c.name] || 0) + 1;
      }
      const ccm: Record<string, number> = {};
      for (const c of clinicData) { if (c.id) ccm[c.id] = nameCount[c.name] || 1; }

      setGuMap(gm);
      setHomepageMap(hm);
      setSiteTypeMap(stm);
      setChainCountMap(ccm);
      setNoOfficialMap(noOff);
      setLoading(false);
    });
  }, []);

  /* ─── Clinic summaries from pre-aggregated view ─── */
  const clinicCrawls = useMemo<ClinicCrawl[]>(() => {
    return pageSummaries.map(s => ({
      hira_id: s.hira_id,
      clinic_name: s.clinic_name,
      gu: guMap[s.hira_id] || '기타',
      pages: s.pages,
      totalChars: s.total_chars,
      imageCount: imageCounts[s.hira_id] || 0,
      isChain: (chainCountMap[s.hira_id] || 1) >= 2,
      homepage: homepageMap[s.hira_id] || '',
      siteType: siteTypeMap[s.hira_id],
    })).sort((a, b) => a.clinic_name.localeCompare(b.clinic_name, 'ko'));
  }, [pageSummaries, guMap, homepageMap, siteTypeMap, chainCountMap, imageCounts]);

  /* ─── Chain commons (unified + mixed only) ─── */
  const chainCommons = useMemo<ChainCommon[]>(() => {
    const chains = clinicCrawls.filter(c => c.isChain && (c.siteType === 'unified' || c.siteType === 'mixed'));
    const byName = new Map<string, ClinicCrawl[]>();
    for (const c of chains) {
      if (!byName.has(c.clinic_name)) byName.set(c.clinic_name, []);
      byName.get(c.clinic_name)!.push(c);
    }
    const result: ChainCommon[] = [];
    for (const [name, entries] of byName) {
      result.push({
        clinic_name: name,
        hira_ids: entries.map(e => e.hira_id),
        totalPages: entries.reduce((s, e) => s + e.pages, 0),
      });
    }
    return result.filter(c => c.totalPages > 0).sort((a, b) => a.clinic_name.localeCompare(b.clinic_name, 'ko'));
  }, [clinicCrawls]);

  /* ─── District groups ─── */
  const guGroups = useMemo<GuSummary[]>(() => {
    const map = new Map<string, GuSummary>();
    for (const c of clinicCrawls) {
      if (!map.has(c.gu)) {
        map.set(c.gu, { gu: c.gu, clinics: [], totalPages: 0, totalImages: 0 });
      }
      const g = map.get(c.gu)!;
      g.clinics.push(c);
      g.totalPages += c.pages;
      g.totalImages += c.imageCount;
    }
    return [...map.values()].sort((a, b) => a.gu.localeCompare(b.gu, 'ko'));
  }, [clinicCrawls]);

  /* ─── Select clinic ─── */
  const selectClinic = useCallback(async (hiraId: string, clinicName: string, mode: 'all' | 'branch' | 'common') => {
    setSelectedClinic(hiraId);
    setSelectedClinicName(clinicName);
    setSelectedMode(mode);
    setExpandedPageId(null);
    setClinicLoading(true);

    const { data } = await supabase
      .from('crawl_pages')
      .select('id, url, raw_text, char_count')
      .eq('hira_id', hiraId)
      .order('id');

    setClinicPages(data || []);
    setClinicLoading(false);
  }, []);

  /* ─── Filtered pages by mode ─── */
  const selectedEntry = clinicCrawls.find(c => c.hira_id === selectedClinic);
  const filteredPages = useMemo(() => {
    if (selectedMode === 'all' || !selectedEntry?.isChain) return clinicPages;
    return clinicPages.filter(p => classifySourceUrl(p.url, selectedEntry.homepage, selectedEntry.siteType) === selectedMode);
  }, [clinicPages, selectedMode, selectedEntry]);

  /* ─── Stats ─── */
  const totalClinics = clinicCrawls.length;
  const totalPages = pageSummaries.reduce((s, p) => s + p.pages, 0);
  const totalImages = Object.values(imageCounts).reduce((s, c) => s + c, 0);

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
              <span className="text-lg">💎</span>
              <span className="font-bold text-sm gradient-brand-text hidden sm:inline">En beauté</span>
            </Link>
            <span className="text-[var(--border)]">|</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">크롤 데이터</span>
              <Link href="/admin/images" className="text-[11px] font-semibold text-[var(--primary)] hover:underline">이미지 검수 →</Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="px-2.5 py-1 bg-[var(--primary-soft)] text-[var(--primary)] rounded-full">{totalClinics}개 클리닉</span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{totalPages.toLocaleString()}개 페이지</span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{totalImages.toLocaleString()}개 이미지</span>
          </div>
        </div>
      </header>

      {!selectedClinic ? (
        <div className="max-w-4xl mx-auto px-5 py-6 space-y-8">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">크롤 현황</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">크롤 완료된 클리닉의 raw text와 이미지 현황</p>
          </div>

          {/* Chain common section */}
          {chainCommons.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3 px-1">
                <h2 className="text-sm font-bold text-violet-600">체인 공통</h2>
                <span className="text-[11px] text-[var(--text-light)]">전 지점 공유 콘텐츠</span>
              </div>
              <div className="bg-white rounded-xl border border-violet-200 overflow-hidden">
                <div className="divide-y divide-[var(--border-soft)]">
                  {chainCommons.map(ch => (
                    <button
                      key={ch.clinic_name}
                      onClick={() => selectClinic(ch.hira_ids[0], ch.clinic_name, 'common')}
                      className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-violet-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-violet-700 group-hover:text-violet-900">{ch.clinic_name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded">{ch.hira_ids.length}개 지점</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-violet-400">{ch.totalPages}p</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-300 group-hover:text-violet-500">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* District groups */}
          {guGroups.length === 0 && chainCommons.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <p className="text-lg mb-1">크롤 데이터가 없습니다</p>
              <p className="text-sm">crawl.mjs를 실행해주세요.</p>
            </div>
          ) : (
            guGroups.map(g => (
              <div key={g.gu}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <h3 className="text-sm font-bold text-[var(--text)]">{g.gu}</h3>
                  <span className="text-[11px] text-[var(--text-light)]">
                    {g.clinics.length}개 클리닉 · {g.totalPages}p
                    {(noOfficialMap[g.gu]?.length || 0) > 0 && ` · ${noOfficialMap[g.gu].length}개 공식사이트 없음`}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="divide-y divide-[var(--border-soft)]">
                    {g.clinics.map(c => {
                      const isUnified = c.isChain && c.siteType === 'unified';
                      return isUnified ? (
                        <div key={c.hira_id} className="flex items-center gap-4 px-5 py-2.5 opacity-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-[var(--text-light)]">{c.clinic_name}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded">체인</span>
                            </div>
                            <div className="text-[11px] text-[var(--text-light)]">지점 전용 없음 — 위 체인 공통에서 확인</div>
                          </div>
                        </div>
                      ) : (
                        <button
                          key={c.hira_id}
                          onClick={() => selectClinic(c.hira_id, c.clinic_name, c.isChain ? 'branch' : 'all')}
                          className="w-full flex items-center gap-4 px-5 py-2.5 text-left hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate">
                                {c.clinic_name}
                              </span>
                              {c.isChain && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded shrink-0">지점</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-[var(--text-light)] shrink-0">
                            <span>{c.pages}p</span>
                            <span>{(c.totalChars / 1000).toFixed(1)}k자</span>
                            {c.imageCount > 0 && <span className="text-[var(--primary)]">{c.imageCount}img</span>}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-light)] group-hover:text-[var(--primary)]">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      );
                    })}
                    {(noOfficialMap[g.gu] || []).map(c => (
                      <div key={c.id} className="flex items-center gap-4 px-5 py-2.5 opacity-50">
                        <span className="text-sm text-[var(--text-light)]">{c.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-400 rounded ml-auto">공식사이트 없음</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ─── Detail view ─── */
        <div className="max-w-4xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelectedClinic(null)} className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              목록으로
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text)]">{selectedClinicName}</span>
              {selectedMode !== 'all' && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${selectedMode === 'common' ? 'bg-sky-100 text-sky-600' : 'bg-violet-100 text-violet-600'}`}>
                  {selectedMode === 'common' ? '공통' : '지점 전용'}
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--text-muted)]">{filteredPages.length}개 페이지</span>
          </div>

          {clinicLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-muted)]">
              <p className="text-lg mb-1">해당 유형의 페이지가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPages.map(p => {
                const isExpanded = expandedPageId === p.id;
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
                    <button
                      onClick={() => setExpandedPageId(isExpanded ? null : p.id)}
                      className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--text)] truncate">{p.url}</p>
                        <p className="text-[11px] text-[var(--text-light)] mt-0.5">{p.char_count.toLocaleString()}자</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-[var(--text-light)] transition-transform shrink-0 ml-3 ${isExpanded ? 'rotate-180' : ''}`}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-[var(--border-soft)]">
                        <pre className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap mt-3 max-h-[600px] overflow-y-auto">
                          {p.raw_text}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
