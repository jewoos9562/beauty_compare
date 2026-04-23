'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { classifySourceUrl, type SiteType } from '@/lib/chain-utils';

/* ─── Types ─── */
interface ImageSummary {
  hira_id: string;
  clinic_name: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface CrawlImage {
  id: number;
  hira_id: string;
  clinic_name: string;
  source_url: string;
  image_url: string;
  storage_path: string;
  alt_text: string | null;
  context: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  score: number;
  ocr_status: string;
  status: string;
  tag: string | null;
  reviewed_at: string | null;
}

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface ClinicEntry {
  hira_id: string;
  clinic_name: string;
  gu: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  isChain: boolean;
  homepage: string;
  siteType?: SiteType;
  branchTotal: number;
  commonTotal: number;
}

interface GuGroup {
  gu: string;
  clinics: ClinicEntry[];
  total: number;
  pending: number;
}

interface ChainCommon {
  clinic_name: string;
  hira_ids: string[];
  commonTotal: number;
  commonPending: number;
}

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/crawl-images/';

const IMAGE_TAGS = [
  { value: 'price_table', label: '가격표', color: 'bg-blue-100 text-blue-700' },
  { value: 'before_after', label: '전후사진', color: 'bg-pink-100 text-pink-700' },
  { value: 'interior', label: '내부사진', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'doctor', label: '원장/의료진', color: 'bg-violet-100 text-violet-700' },
  { value: 'event', label: '이벤트/배너', color: 'bg-amber-100 text-amber-700' },
  { value: 'other', label: '기타', color: 'bg-slate-100 text-slate-600' },
] as const;

const STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '대기', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  approved: { label: '승인', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  rejected: { label: '거절', color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
};

/* ─── Main Page ─── */
export default function AdminImagesPage() {
  const [summaries, setSummaries] = useState<ImageSummary[]>([]);
  const [guMap, setGuMap] = useState<Record<string, string>>({});
  const [homepageMap, setHomepageMap] = useState<Record<string, string>>({});
  const [siteTypeMap, setSiteTypeMap] = useState<Record<string, SiteType>>({});
  const [chainCountMap, setChainCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'all' | 'branch' | 'common'>('all');
  const [clinicImages, setClinicImages] = useState<CrawlImage[]>([]);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('pending');

  useEffect(() => {
    Promise.all([
      supabase.from('crawl_image_summary').select('*').then(r => r.data || []) as Promise<ImageSummary[]>,
      fetch('/data/seoul_derma.json').then(r => r.json()),
    ]).then(([imgSummaries, clinicData]) => {
      setSummaries(imgSummaries);
      const gMap: Record<string, string> = {};
      const hMap: Record<string, string> = {};
      const stMap: Record<string, SiteType> = {};
      const nameCount: Record<string, number> = {};
      for (const c of clinicData) {
        if (c.id) {
          gMap[c.id] = c.gu || '기타';
          if (c.homepage) hMap[c.id] = c.homepage;
          if (c.site_type) stMap[c.id] = c.site_type;
        }
        nameCount[c.name] = (nameCount[c.name] || 0) + 1;
      }
      const ccMap: Record<string, number> = {};
      for (const c of clinicData) {
        if (c.id) ccMap[c.id] = nameCount[c.name] || 1;
      }
      setGuMap(gMap);
      setHomepageMap(hMap);
      setSiteTypeMap(stMap);
      setChainCountMap(ccMap);
      setLoading(false);
    });
  }, []);

  /* ─── Build clinic entries from pre-aggregated summary ─── */
  const clinicEntries = useMemo<ClinicEntry[]>(() => {
    return summaries.map(s => ({
      hira_id: s.hira_id,
      clinic_name: s.clinic_name,
      gu: guMap[s.hira_id] || '기타',
      total: s.total,
      pending: s.pending,
      approved: s.approved,
      rejected: s.rejected,
      isChain: (chainCountMap[s.hira_id] || 1) >= 2,
      homepage: homepageMap[s.hira_id] || '',
      siteType: siteTypeMap[s.hira_id],
      branchTotal: 0, commonTotal: 0,
    })).sort((a, b) => a.clinic_name.localeCompare(b.clinic_name, 'ko'));
  }, [summaries, guMap, homepageMap, siteTypeMap, chainCountMap]);

  /* ─── Chains with common images (unified + mixed only) ─── */
  const chainCommons = useMemo<ChainCommon[]>(() => {
    // Only unified/mixed have common images. independent = all branch, no common.
    const chainClinics = clinicEntries.filter(c => c.isChain && (c.siteType === 'unified' || c.siteType === 'mixed'));
    const byName = new Map<string, ClinicEntry[]>();
    for (const c of chainClinics) {
      if (!byName.has(c.clinic_name)) byName.set(c.clinic_name, []);
      byName.get(c.clinic_name)!.push(c);
    }
    const result: ChainCommon[] = [];
    for (const [name, entries] of byName) {
      result.push({
        clinic_name: name,
        hira_ids: entries.map(e => e.hira_id),
        commonTotal: entries.reduce((s, e) => s + e.total, 0),
        commonPending: entries.reduce((s, e) => s + e.pending, 0),
      });
    }
    return result.filter(c => c.commonTotal > 0).sort((a, b) => a.clinic_name.localeCompare(b.clinic_name, 'ko'));
  }, [clinicEntries]);

  /* ─── District groups (chain clinics show branch-only label) ─── */
  const guGroups = useMemo<GuGroup[]>(() => {
    const map = new Map<string, GuGroup>();
    for (const c of clinicEntries) {
      if (!map.has(c.gu)) {
        map.set(c.gu, { gu: c.gu, clinics: [], total: 0, pending: 0 });
      }
      const g = map.get(c.gu)!;
      g.clinics.push(c);
      g.total += c.total;
      g.pending += c.pending;
    }
    return [...map.values()].sort((a, b) => a.gu.localeCompare(b.gu, 'ko'));
  }, [clinicEntries]);

  /* ─── Select clinic to review ─── */
  const selectClinic = useCallback(async (hiraId: string, mode: 'all' | 'branch' | 'common') => {
    setSelectedClinicId(hiraId);
    setSelectedMode(mode);
    setReviewIndex(0);
    setStatusFilter('pending');
    setClinicLoading(true);

    const all: CrawlImage[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('crawl_images').select('*')
        .eq('hira_id', hiraId)
        .order('score', { ascending: false })
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      all.push(...(data as CrawlImage[]));
      if (data.length < 1000) break;
      from += 1000;
    }

    setClinicImages(all);
    setClinicLoading(false);
  }, []);

  /* ─── Review list: filter once on load, then freeze during review ─── */
  const selectedEntry = clinicEntries.find(c => c.hira_id === selectedClinicId);
  const [reviewList, setReviewList] = useState<CrawlImage[]>([]);

  // Build review list when clinic is selected or filters change — but not when images are updated
  useEffect(() => {
    let list = clinicImages;
    if (statusFilter !== 'all') {
      list = list.filter(i => (i.status || 'pending') === statusFilter);
    }
    if (selectedMode !== 'all' && selectedEntry?.isChain) {
      list = list.filter(i => classifySourceUrl(i.source_url, selectedEntry.homepage, selectedEntry.siteType) === selectedMode);
    }
    setReviewList(list);
    setReviewIndex(0);
    // Only rebuild when filters change, not when clinicImages updates (to prevent index shifting)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinicId, statusFilter, selectedMode]);

  // Keep review list's status in sync with clinicImages (for badge display) without removing items
  const reviewListSynced = useMemo(() => {
    const map = new Map(clinicImages.map(img => [img.id, img]));
    return reviewList.map(img => map.get(img.id) || img);
  }, [reviewList, clinicImages]);

  /* ─── Actions ─── */
  const updateImage = useCallback(async (id: number, updates: Partial<CrawlImage>) => {
    const { error } = await supabase
      .from('crawl_images')
      .update({ ...updates, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('Update failed:', error); return; }
    const ts = new Date().toISOString();
    setClinicImages(prev => prev.map(img => img.id === id ? { ...img, ...updates, reviewed_at: ts } : img));
  }, []);

  /* ─── Keyboard (use refs to avoid re-registration on every state change) ─── */
  const reviewIndexRef = useRef(reviewIndex);
  reviewIndexRef.current = reviewIndex;
  const filteredRef = useRef(reviewListSynced);
  filteredRef.current = reviewListSynced;

  useEffect(() => {
    if (!selectedClinicId) return;
    let busy = false;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (busy) return;
      const imgs = filteredRef.current;
      const idx = reviewIndexRef.current;
      const current = imgs[idx];
      if (!current) return;

      if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        busy = true;
        if ((current.status || 'pending') === 'pending') updateImage(current.id, { status: 'rejected' });
        setReviewIndex(i => Math.min(i + 1, imgs.length - 1));
        setTimeout(() => { busy = false; }, 150);
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        busy = true;
        setReviewIndex(i => Math.max(i - 1, 0));
        setTimeout(() => { busy = false; }, 150);
      } else if (e.key === ' ') {
        e.preventDefault();
        busy = true;
        updateImage(current.id, { status: 'approved' });
        setReviewIndex(i => Math.min(i + 1, imgs.length - 1));
        setTimeout(() => { busy = false; }, 150);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedClinicId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedClinicId, updateImage]);

  const totalPending = clinicEntries.reduce((s, c) => s + c.pending, 0);
  const totalApproved = clinicEntries.reduce((s, c) => s + c.approved, 0);
  const totalRejected = clinicEntries.reduce((s, c) => s + c.rejected, 0);

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
              <span className="text-sm font-semibold">이미지 검수</span>
              <Link href="/admin/crawls" className="text-[11px] font-semibold text-[var(--primary)] hover:underline">크롤 데이터 →</Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200">대기 {totalPending.toLocaleString()}</span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">승인 {totalApproved.toLocaleString()}</span>
            <span className="px-2.5 py-1 bg-red-50 text-red-500 rounded-full border border-red-200">거절 {totalRejected.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {!selectedClinicId ? (
        /* ─── Queue: Chain commons + District groups ─── */
        <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
          {/* Chain common section */}
          {chainCommons.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3 px-1">
                <h2 className="text-sm font-bold text-violet-600">체인 공통</h2>
                <span className="text-[11px] text-[var(--text-light)]">전 지점 공유 이미지</span>
              </div>
              <div className="space-y-1.5">
                {chainCommons.map(ch => (
                  <button
                    key={ch.clinic_name}
                    onClick={() => selectClinic(ch.hira_ids[0], 'common')}
                    className="w-full flex items-center gap-4 px-5 py-3.5 bg-violet-50 rounded-xl border border-violet-200 hover:border-violet-400 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-violet-700 group-hover:text-violet-900 transition-colors">{ch.clinic_name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded">{ch.hira_ids.length}개 지점</span>
                      </div>
                      <div className="text-[11px] text-violet-400 mt-0.5">공통 이미지</div>
                    </div>
                    {ch.commonPending > 0 && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold border border-amber-200">{ch.commonPending} 대기</span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-300 group-hover:text-violet-500">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* District groups */}
          {guGroups.map(g => (
            <CollapsibleGu key={g.gu} title={g.gu} subtitle={`${g.clinics.length}개 클리닉 · ${g.total.toLocaleString()}장`} badge={g.pending > 0 ? `${g.pending.toLocaleString()} 대기` : undefined}>
              <div className="space-y-1.5">
                {g.clinics.map(c => {
                  const isUnified = c.isChain && c.siteType === 'unified';
                  return isUnified ? (
                    // Unified chain: no branch images, show "공통에서 확인"
                    <div key={c.hira_id} className="flex items-center gap-4 px-5 py-3.5 bg-white rounded-xl border border-[var(--border)] opacity-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[var(--text-light)]">{c.clinic_name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded shrink-0">체인</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-light)] mt-0.5">지점 전용 이미지 없음 �� 위 체인 공통에서 확인</div>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={c.hira_id}
                      onClick={() => selectClinic(c.hira_id, c.isChain ? 'branch' : 'all')}
                      className="w-full flex items-center gap-4 px-5 py-3.5 bg-white rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[var(--text)] truncate group-hover:text-[var(--primary)] transition-colors">
                            {c.clinic_name}
                          </span>
                          {c.isChain && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded shrink-0">지점</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-light)] mt-0.5">
                          {c.isChain ? '지점 전용' : '총'} {c.total}장
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.pending > 0 && <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold border border-amber-200">{c.pending} 대기</span>}
                        {c.approved > 0 && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-200">{c.approved}</span>}
                        {c.rejected > 0 && <span className="px-2.5 py-1 bg-red-50 text-red-400 rounded-lg text-xs font-bold border border-red-200">{c.rejected}</span>}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-light)] group-hover:text-[var(--primary)]">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </CollapsibleGu>
          ))}

          {guGroups.length === 0 && chainCommons.length === 0 && (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <p className="text-lg mb-1">이미지가 없습니다</p>
              <p className="text-sm">크롤링을 먼저 실행해주세요.</p>
            </div>
          )}
        </div>
      ) : clinicLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      ) : (
        /* ─── Review View ─── */
        <ReviewView
          entry={selectedEntry!}
          mode={selectedMode}
          images={reviewListSynced}
          allImages={clinicImages}
          reviewIndex={reviewIndex}
          setReviewIndex={setReviewIndex}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onBack={() => setSelectedClinicId(null)}
          onUpdate={updateImage}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Review View
   ═══════════════════════════════════════════ */
function ReviewView({
  entry, mode, images, allImages, reviewIndex, setReviewIndex,
  statusFilter, setStatusFilter, onBack, onUpdate,
}: {
  entry: ClinicEntry;
  mode: 'all' | 'branch' | 'common';
  images: CrawlImage[];
  allImages: CrawlImage[];
  reviewIndex: number;
  setReviewIndex: (i: number | ((prev: number) => number)) => void;
  statusFilter: ReviewStatus | 'all';
  setStatusFilter: (s: ReviewStatus | 'all') => void;
  onBack: () => void;
  onUpdate: (id: number, updates: Partial<CrawlImage>) => void;
}) {
  const current = images[reviewIndex] || null;
  const imageScrollRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewIndex]);

  const pendingCount = allImages.filter(i => (i.status || 'pending') === 'pending').length;
  const approvedCount = allImages.filter(i => i.status === 'approved').length;
  const rejectedCount = allImages.filter(i => i.status === 'rejected').length;

  const modeLabel = mode === 'common' ? '공통' : mode === 'branch' ? '지점 전용' : '';

  return (
    <div className="max-w-6xl mx-auto px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          목록으로
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text)]">{entry.clinic_name}</span>
          {modeLabel && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${mode === 'common' ? 'bg-sky-100 text-sky-600' : 'bg-violet-100 text-violet-600'}`}>
              {modeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-[var(--surface-soft)] rounded-lg p-1 border border-[var(--border)]">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(s => {
            const count = s === 'all' ? allImages.length : s === 'pending' ? pendingCount : s === 'approved' ? approvedCount : rejectedCount;
            const conf = s === 'all' ? { label: '전체', color: 'text-slate-600' } : STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => { setStatusFilter(s); setReviewIndex(0); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === s ? 'bg-white shadow-sm text-[var(--text)]' : `${conf.color} hover:bg-white/50`}`}>
                {conf.label} {count}
              </button>
            );
          })}
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <p className="text-lg mb-1">해당 상태의 이미지가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_320px] gap-5 items-start" style={{ minHeight: 'calc(100vh - 140px)' }}>
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col relative">
            {reviewIndex > 0 && (
              <button onClick={() => setReviewIndex(i => Math.max(i - 1, 0))}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            )}
            {reviewIndex < images.length - 1 && (
              <button onClick={() => setReviewIndex(i => Math.min(i + 1, images.length - 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            )}

            {current && (
              <div ref={imageScrollRef} className="relative bg-slate-50 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                <img src={STORAGE_URL + current.storage_path} alt={current.alt_text || ''} className="w-full h-auto" />
                <div className={`sticky top-3 left-3 float-left px-3 py-1.5 rounded-lg text-xs font-bold border ${STATUS_CONFIG[(current.status || 'pending') as ReviewStatus].bg}`}>
                  {STATUS_CONFIG[(current.status || 'pending') as ReviewStatus].label}
                </div>
              </div>
            )}

            {current && (
              <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--text)]">{reviewIndex + 1} / {images.length}</span>
                  <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" style={{ width: `${((reviewIndex + 1) / images.length) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    if ((current.status || 'pending') === 'pending') onUpdate(current.id, { status: 'rejected' });
                    setReviewIndex(i => Math.min(i + 1, images.length - 1));
                  }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    넘기기 <kbd className="ml-1.5 text-[10px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">→</kbd>
                  </button>
                  <button onClick={() => { onUpdate(current.id, { status: 'approved' }); setReviewIndex(i => Math.min(i + 1, images.length - 1)); }}
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors shadow-sm">
                    승인 <kbd className="ml-1.5 text-[10px] text-indigo-200 bg-indigo-500 px-1.5 py-0.5 rounded">Space</kbd>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {current && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
                <h3 className="text-xs font-bold text-[var(--text-light)] uppercase tracking-wide mb-3">이미지 정보</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)] text-xs">크기</span>
                    <p className="font-medium">{current.width}x{current.height} · {fmtSize(current.file_size)}</p>
                  </div>
                  {current.context && (
                    <div>
                      <span className="text-[var(--text-muted)] text-xs">주변 텍스트</span>
                      <p className="text-[var(--text-muted)] text-xs leading-relaxed mt-1">{current.context}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[var(--text-muted)] text-xs">출처</span>
                    <a href={current.source_url} target="_blank" rel="noopener" className="block text-xs text-[var(--primary)] hover:underline truncate mt-0.5">{current.source_url}</a>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
                  <span className="text-xs font-bold text-[var(--text-light)] uppercase tracking-wide">태그</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {IMAGE_TAGS.map(t => (
                      <button key={t.value} onClick={() => onUpdate(current.id, { tag: current.tag === t.value ? null : t.value })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${current.tag === t.value ? `${t.color} border-current shadow-sm` : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl border border-[var(--border)] p-4">
              <h3 className="text-[10px] font-bold text-[var(--text-light)] uppercase tracking-wide mb-2">키보드 단축키</h3>
              <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                {[['승인', 'Space'], ['넘기기 (=거절)', '→ / J'], ['이전', '← / K'], ['목록으로', 'ESC']].map(([label, key]) => (
                  <div key={label} className="flex justify-between"><span>{label}</span><span className="font-mono text-[var(--text-light)]">{key}</span></div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[var(--border)] p-3">
              <h3 className="text-[10px] font-bold text-[var(--text-light)] uppercase tracking-wide mb-2 px-1">미리보기</h3>
              <div className="grid grid-cols-4 gap-1.5 max-h-[300px] overflow-y-auto hide-scrollbar">
                {images.map((img, i) => {
                  const st = (img.status || 'pending') as ReviewStatus;
                  return (
                    <button key={img.id} onClick={() => setReviewIndex(i)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        i === reviewIndex ? 'border-[var(--primary)] shadow-md scale-105'
                        : st === 'approved' ? 'border-emerald-300 opacity-80'
                        : st === 'rejected' ? 'border-red-200 opacity-40'
                        : 'border-transparent opacity-70 hover:opacity-100'
                      }`}>
                      <img src={STORAGE_URL + img.storage_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                      {st === 'approved' && (
                        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                        </div>
                      )}
                      {st === 'rejected' && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleGu({ title, subtitle, badge, children }: {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 mb-2 px-1 text-left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-[var(--text-light)] transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <h3 className="text-sm font-bold text-[var(--text)]">{title}</h3>
        <span className="text-[11px] text-[var(--text-light)]">{subtitle}</span>
        {badge && (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold border border-amber-200">{badge}</span>
        )}
      </button>
      {open && children}
    </div>
  );
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '-';
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  return (bytes / 1024).toFixed(0) + 'KB';
}
