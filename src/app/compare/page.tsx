'use client';

import Link from 'next/link';
import LangCurrencySelector from '@/components/LangCurrencySelector';

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
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

      <div className="max-w-3xl mx-auto px-5 py-20 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-brand mb-6">
          <span className="text-4xl">💰</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
          시술 <span className="gradient-brand-text">가격 비교</span>
        </h1>
        <p className="text-[var(--text-muted)] text-lg mb-3 leading-relaxed">
          서울 주요 피부과/미용의원의 시술 가격을 비교하는 기능을 준비 중입니다.
        </p>
        <p className="text-sm text-[var(--text-light)] mb-10">
          공식 홈페이지 기반 가격 데이터를 수집하여 정확한 비교 정보를 제공할 예정입니다.
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-2xl gradient-brand hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
        >
          🗺️ 지도에서 의원 찾기
        </Link>
      </div>
    </div>
  );
}
