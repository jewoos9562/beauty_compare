'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { HiraClinic } from '@/types/hira';
import LangCurrencySelector from '@/components/LangCurrencySelector';

const STATS = { clinics: 2803, gu: 25, featured: 9 };

const FEATURES = [
  {
    icon: '🗺️',
    title: '지도로 탐색',
    desc: '서울 전역 2,800+ 피부과/미용의원을 지도에서 바로 확인하세요.',
  },
  {
    icon: '💰',
    title: '가격 비교',
    desc: '주요 프랜차이즈 체인의 시술별 가격을 한눈에 비교하세요.',
  },
  {
    icon: '⭐',
    title: '리뷰 & 평점',
    desc: 'Google 리뷰 기반 실사용자 평가를 확인하세요.',
  },
  {
    icon: '🌏',
    title: '다국어 지원',
    desc: '한국어, English, 日本語, 中文, Español — 5개국어로 이용 가능합니다.',
  },
];

const TOP_GU = [
  { name: '강남구', count: 849 },
  { name: '서초구', count: 296 },
  { name: '송파구', count: 160 },
  { name: '마포구', count: 137 },
  { name: '중구', count: 114 },
  { name: '강서구', count: 109 },
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: scrollY > 40 ? 'rgba(255,255,255,0.88)' : 'transparent',
          backdropFilter: scrollY > 40 ? 'blur(16px)' : 'none',
          borderBottom: scrollY > 40 ? '1px solid var(--border)' : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <span className="font-bold text-lg tracking-tight">
              <span className="gradient-brand-text">En beauté</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LangCurrencySelector />
            <Link
              href="/explore"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              탐색
            </Link>
            <Link
              href="/explore"
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl gradient-brand hover:opacity-90 transition-opacity shadow-sm"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-5 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-20 -left-40 w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }}
          />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-sm font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            서울 {STATS.clinics.toLocaleString()}+ 피부과 의원 데이터
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            서울 피부과{' '}
            <span className="gradient-brand-text">가격 비교</span>
            <br className="hidden sm:block" />
            <span className="text-3xl sm:text-4xl md:text-5xl">한눈에 보는 미용의원 정보</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-xl mx-auto mb-10 leading-relaxed">
            HIRA 공식 데이터 기반 서울 전역 피부과/미용의원 검색,
            주요 프랜차이즈 시술 가격 비교, 리뷰까지 — 한 곳에서 비교하세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/explore"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-2xl gradient-brand hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20"
            >
              🗺️ 지도에서 찾아보기
            </Link>
            <Link
              href="/compare"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-[var(--text)] bg-white rounded-2xl border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
            >
              💰 가격 비교하기
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8 border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-5 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold gradient-brand-text">
              {STATS.clinics.toLocaleString()}+
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">등록 의원</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold gradient-brand-text">
              {STATS.gu}
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">서울 전 자치구</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold gradient-brand-text">
              {STATS.featured}
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">가격 비교 체인</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 tracking-tight">
            왜 <span className="gradient-brand-text">En beauté</span>인가요?
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-12 max-w-lg mx-auto">
            건강보험심사평가원 공식 데이터와 실시간 크롤링 가격 정보를 결합했습니다.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-lg transition-all duration-200"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--primary)] transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top districts */}
      <section className="py-20 px-5 bg-white border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 tracking-tight">
            인기 <span className="gradient-brand-text">자치구</span>
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-12">
            가장 많은 피부과 의원이 있는 서울의 자치구
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {TOP_GU.map((g) => (
              <Link
                key={g.name}
                href="/explore"
                className="group flex items-center gap-4 p-5 rounded-2xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md transition-all bg-[var(--surface-soft)]"
              >
                <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {g.name.slice(0, 1)}
                </div>
                <div>
                  <div className="font-bold text-base group-hover:text-[var(--primary)] transition-colors">
                    {g.name}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {g.count.toLocaleString()}개 의원
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
            지금 바로 비교해보세요
          </h2>
          <p className="text-[var(--text-muted)] text-lg mb-8 leading-relaxed">
            서울 전역의 피부과/미용의원 정보를 무료로 검색하고 비교하세요.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-10 py-4 text-lg font-semibold text-white rounded-2xl gradient-brand hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25"
          >
            🗺️ 탐색 시작
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-5 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-light)]">
          <div className="flex items-center gap-2">
            <span>💎</span>
            <span className="font-semibold text-[var(--text-muted)]">En beauté Compare</span>
          </div>
          <div>
            Data by HIRA (건강보험심사평가원) · Map by OpenStreetMap
          </div>
        </div>
      </footer>
    </div>
  );
}
