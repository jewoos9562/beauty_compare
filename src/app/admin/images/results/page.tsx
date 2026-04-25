'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase, fetchAll } from '@/lib/supabase';

const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/crawl-images/';

interface ReviewedImage {
  id: number;
  hira_id: string;
  clinic_name: string;
  storage_path: string;
  status: string;
  width: number | null;
  height: number | null;
}

interface GuClinic {
  gu: string;
  clinics: { name: string; hira_id: string; approved: ReviewedImage[]; rejected: ReviewedImage[] }[];
}

export default function ResultsPage() {
  const [images, setImages] = useState<ReviewedImage[]>([]);
  const [guMap, setGuMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'approved' | 'rejected'>('approved');

  useEffect(() => {
    Promise.all([
      fetchAll<ReviewedImage>('crawl_images', 'id, hira_id, clinic_name, storage_path, status, width, height'),
      fetch('/data/seoul_derma.json').then(r => r.json()),
    ]).then(([imgs, clinicData]) => {
      setImages(imgs.filter(i => i.status === 'approved' || i.status === 'rejected'));
      const gm: Record<string, string> = {};
      for (const c of clinicData) { if (c.id) gm[c.id] = c.gu || '기타'; }
      setGuMap(gm);
      setLoading(false);
    });
  }, []);

  const grouped = useMemo<GuClinic[]>(() => {
    const filtered = images.filter(i => i.status === viewMode);
    const byClinic = new Map<string, ReviewedImage[]>();
    for (const img of filtered) {
      if (!byClinic.has(img.hira_id)) byClinic.set(img.hira_id, []);
      byClinic.get(img.hira_id)!.push(img);
    }

    const byGu = new Map<string, GuClinic>();
    for (const [hiraId, imgs] of byClinic) {
      const gu = guMap[hiraId] || '기타';
      if (!byGu.has(gu)) byGu.set(gu, { gu, clinics: [] });
      byGu.get(gu)!.clinics.push({
        name: imgs[0].clinic_name,
        hira_id: hiraId,
        approved: images.filter(i => i.hira_id === hiraId && i.status === 'approved'),
        rejected: images.filter(i => i.hira_id === hiraId && i.status === 'rejected'),
      });
    }

    return [...byGu.values()]
      .sort((a, b) => a.gu.localeCompare(b.gu, 'ko'))
      .map(g => ({ ...g, clinics: g.clinics.sort((a, b) => a.name.localeCompare(b.name, 'ko')) }));
  }, [images, guMap, viewMode]);

  const totalApproved = images.filter(i => i.status === 'approved').length;
  const totalRejected = images.filter(i => i.status === 'rejected').length;

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
              <span className="text-sm font-semibold">검수 결과</span>
              <Link href="/admin/images" className="text-[11px] font-semibold text-[var(--primary)] hover:underline">이미지 검수 →</Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'approved' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
              승인 {totalApproved}
            </button>
            <button onClick={() => setViewMode('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'rejected' ? 'bg-red-500 text-white shadow-sm' : 'bg-red-50 text-red-500 border border-red-200'}`}>
              거절 {totalRejected}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-8">
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="text-lg mb-1">{viewMode === 'approved' ? '승인' : '거절'}된 이미지가 없습니다</p>
          </div>
        ) : (
          grouped.map(g => (
            <div key={g.gu}>
              <h2 className="text-sm font-bold text-[var(--text)] mb-3 px-1">{g.gu}</h2>
              {g.clinics.map(c => {
                const imgs = viewMode === 'approved' ? c.approved : c.rejected;
                return (
                  <div key={c.hira_id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-sm font-semibold text-[var(--text)]">{c.name}</span>
                      <span className="text-[11px] text-[var(--text-light)]">
                        승인 {c.approved.length} · 거절 {c.rejected.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {imgs.map(img => (
                        <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-[var(--border)] bg-slate-50">
                          <img
                            src={STORAGE_URL + img.storage_path}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
