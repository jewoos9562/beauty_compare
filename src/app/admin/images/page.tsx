'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
  crawled_at: string;
}

const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/crawl-images/';

const SCORE_COLORS: Record<number, string> = {
  0: 'bg-slate-100 text-slate-500',
  1: 'bg-slate-200 text-slate-600',
  2: 'bg-blue-100 text-blue-600',
  3: 'bg-violet-100 text-violet-600',
  4: 'bg-pink-100 text-pink-600',
  5: 'bg-pink-200 text-pink-700',
  6: 'bg-red-100 text-red-600',
  7: 'bg-red-200 text-red-700',
  8: 'bg-red-300 text-red-800',
};

export default function AdminImagesPage() {
  const [images, setImages] = useState<CrawlImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [selectedImage, setSelectedImage] = useState<CrawlImage | null>(null);

  useEffect(() => {
    supabase
      .from('crawl_images')
      .select('*')
      .order('score', { ascending: false })
      .then(({ data }) => {
        setImages(data || []);
        setLoading(false);
      });
  }, []);

  const clinics = useMemo(() => {
    const m = new Map<string, number>();
    for (const img of images) m.set(img.clinic_name, (m.get(img.clinic_name) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [images]);

  const filtered = useMemo(() => {
    let list = images;
    if (selectedClinic) list = list.filter((i) => i.clinic_name === selectedClinic);
    if (minScore > 0) list = list.filter((i) => i.score >= minScore);
    return list;
  }, [images, selectedClinic, minScore]);

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'MB';
    return (bytes / 1024).toFixed(0) + 'KB';
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80">
              <span className="text-lg">💎</span>
              <span className="font-bold text-sm gradient-brand-text hidden sm:inline">En beauté</span>
            </Link>
            <span className="text-[var(--border)]">|</span>
            <span className="text-sm font-semibold">이미지 관리</span>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-[var(--primary-soft)] text-[var(--primary)] rounded-full">
            {filtered.length} / {images.length}장
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={selectedClinic || ''}
            onChange={(e) => setSelectedClinic(e.target.value || null)}
            className="px-4 py-2 bg-white border border-[var(--border)] rounded-xl text-sm"
          >
            <option value="">전체 클리닉</option>
            {clinics.map(([name, count]) => (
              <option key={name} value={name}>{name} ({count})</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] font-semibold">최소 Score:</span>
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setMinScore(s)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  minScore === s
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'bg-white border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]'
                }`}
              >
                {s}+
              </button>
            ))}
          </div>
        </div>

        {/* Image grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((img) => (
              <div
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className="group cursor-pointer bg-white rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg hover:border-[var(--primary)] transition-all"
              >
                {/* Image */}
                <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                  <img
                    src={SUPABASE_STORAGE_URL + img.storage_path}
                    alt={img.alt_text || ''}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Score badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold ${SCORE_COLORS[img.score] || SCORE_COLORS[8]}`}>
                    ★ {img.score}
                  </div>
                  {/* OCR status */}
                  <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    img.ocr_status === 'done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {img.ocr_status}
                  </div>
                </div>

                {/* Meta */}
                <div className="p-2.5">
                  <div className="text-[11px] font-semibold text-[var(--text)] truncate">{img.clinic_name}</div>
                  <div className="text-[10px] text-[var(--text-light)] mt-0.5">
                    {img.width}×{img.height} · {fmtSize(img.file_size)}
                  </div>
                  {img.context && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-tight">
                      {img.context.slice(0, 60)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-4xl max-h-[90vh] flex flex-col sm:flex-row shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="flex-1 bg-slate-100 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
              <img
                src={SUPABASE_STORAGE_URL + selectedImage.storage_path}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {/* Info panel */}
            <div className="w-full sm:w-72 p-5 border-t sm:border-t-0 sm:border-l border-[var(--border)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${SCORE_COLORS[selectedImage.score] || SCORE_COLORS[8]}`}>
                  ★ Score {selectedImage.score}
                </span>
                <button onClick={() => setSelectedImage(null)} className="text-[var(--text-light)] hover:text-[var(--text)]">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase mb-1">클리닉</div>
                  <div className="font-semibold">{selectedImage.clinic_name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase mb-1">크기</div>
                  <div>{selectedImage.width}×{selectedImage.height} · {fmtSize(selectedImage.file_size)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase mb-1">OCR 상태</div>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                    selectedImage.ocr_status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedImage.ocr_status}
                  </div>
                </div>
                {selectedImage.context && (
                  <div>
                    <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase mb-1">주변 텍스트</div>
                    <div className="text-xs text-[var(--text-muted)] leading-relaxed">{selectedImage.context}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase mb-1">원본 URL</div>
                  <a href={selectedImage.image_url} target="_blank" rel="noopener" className="text-xs text-[var(--primary)] hover:underline break-all">
                    {selectedImage.image_url.slice(0, 80)}...
                  </a>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase mb-1">출처 페이지</div>
                  <a href={selectedImage.source_url} target="_blank" rel="noopener" className="text-xs text-[var(--primary)] hover:underline break-all">
                    {selectedImage.source_url.slice(0, 80)}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
