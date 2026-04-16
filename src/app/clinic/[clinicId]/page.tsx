'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { HiraClinic } from '@/types/hira';
import LangCurrencySelector from '@/components/LangCurrencySelector';

export default function ClinicPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;
  const [clinic, setClinic] = useState<HiraClinic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/seoul_derma.json')
      .then((r) => r.json())
      .then((data: HiraClinic[]) => {
        const found = data.find((c) => c.id === clinicId);
        setClinic(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

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
        <p className="text-[var(--text-muted)]">의원을 찾을 수 없습니다</p>
        <Link href="/explore" className="text-[var(--primary)] font-semibold hover:underline">← 지도로 돌아가기</Link>
      </div>
    );
  }

  const nmap = `https://map.naver.com/p/search/${encodeURIComponent(clinic.name)}?c=${clinic.lng},${clinic.lat},17,0,0,0,dh`;
  const kmap = `https://map.kakao.com/link/search/${encodeURIComponent(clinic.name)}?longitude=${clinic.lng}&latitude=${clinic.lat}`;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="glass border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/explore" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{clinic.name}</h1>
          </div>
          <LangCurrencySelector />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Clinic info card */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 mb-6">
          <h2 className="text-xl font-extrabold mb-4">{clinic.name}</h2>

          <div className="space-y-2 mb-6">
            <div className="flex items-start gap-3 text-sm">
              <span className="text-[var(--text-light)] shrink-0">📍</span>
              <span className="text-[var(--text)]">{clinic.addr}</span>
            </div>
            {clinic.tel && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[var(--text-light)] shrink-0">📞</span>
                <a href={`tel:${clinic.tel.replace(/[^0-9]/g, '')}`} className="text-[var(--primary)] hover:underline font-medium">
                  {clinic.tel}
                </a>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[var(--text-light)] shrink-0">🏥</span>
              <span className="text-[var(--text-muted)]">{clinic.gu} {clinic.dong}</span>
            </div>
            {clinic.estbDd && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[var(--text-light)] shrink-0">📅</span>
                <span className="text-[var(--text-muted)]">
                  개설 {clinic.estbDd.slice(0, 4)}.{clinic.estbDd.slice(4, 6)}.{clinic.estbDd.slice(6)}
                </span>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {clinic.homepage && (
              <a
                href={clinic.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary-soft)] text-[var(--primary)] rounded-xl text-sm font-semibold hover:bg-[var(--primary)] hover:text-white transition-all"
              >
                🌐 홈페이지
              </a>
            )}
            <a
              href={nmap}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-600 hover:text-white transition-all"
            >
              🗺️ 네이버 지도
            </a>
            <a
              href={kmap}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-semibold hover:bg-yellow-500 hover:text-white transition-all"
            >
              🗺️ 카카오맵
            </a>
          </div>
        </div>

        {/* Price section placeholder */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-100 mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-bold mb-2">시술 가격 정보</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            이 의원의 시술 가격 정보를 준비 중입니다.<br />
            공식 홈페이지에서 최신 가격을 확인해주세요.
          </p>
          {clinic.homepage && (
            <a
              href={clinic.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl gradient-brand hover:opacity-90 transition-opacity"
            >
              🌐 공식 홈페이지에서 확인
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
