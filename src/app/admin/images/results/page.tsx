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
  ocr_text: string | null;
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
  const [selectedImage, setSelectedImage] = useState<ReviewedImage | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAll<ReviewedImage>('crawl_images', 'id, hira_id, clinic_name, storage_path, status, width, height, ocr_text'),
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
                        <button key={img.id} onClick={() => setSelectedImage(img)}
                          className={`aspect-square rounded-lg overflow-hidden border bg-slate-50 transition-all hover:shadow-md hover:scale-105 ${img.ocr_text ? 'border-emerald-300' : 'border-[var(--border)]'}`}>
                          <img src={STORAGE_URL + img.storage_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-5xl max-h-[90vh] flex flex-col sm:flex-row shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Image */}
            <div className="flex-1 bg-slate-100 overflow-auto max-h-[70vh] sm:max-h-[90vh]">
              <img src={STORAGE_URL + selectedImage.storage_path} alt="" className="w-full h-auto" />
            </div>
            {/* OCR Text */}
            <div className="w-full sm:w-80 p-5 border-t sm:border-t-0 sm:border-l border-[var(--border)] overflow-y-auto max-h-[40vh] sm:max-h-[90vh]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[var(--text-light)] uppercase tracking-wide">OCR 텍스트</h3>
                <button onClick={() => setSelectedImage(null)} className="text-[var(--text-light)] hover:text-[var(--text)] text-lg leading-none">&times;</button>
              </div>
              <div className="text-sm text-[var(--text-muted)] mb-3">
                {selectedImage.clinic_name} · {selectedImage.width}x{selectedImage.height}
              </div>
              {selectedImage.ocr_text ? (
                <pre className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3">
                  {selectedImage.ocr_text}
                </pre>
              ) : (
                <div className="text-center py-8 text-[var(--text-light)]">
                  <p className="text-sm">OCR 미완료</p>
                  <p className="text-[11px] mt-1">ocr-approved.mjs 실행 필요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
