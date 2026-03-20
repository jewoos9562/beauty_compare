'use client';

import { useState } from 'react';
import { LANGS, CURRENCIES } from '@/i18n/translations';
import { useI18n } from '@/context/I18nContext';
import type { Lang, Currency } from '@/i18n/translations';

export default function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const { lang, currency, setLang, setCurrency, t } = useI18n();
  const [step, setStep] = useState<'lang' | 'currency'>('lang');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            {t('welcome.title')}
          </h1>
          <p className="text-sm text-slate-500">{t('welcome.subtitle')}</p>
        </div>

        {step === 'lang' ? (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              {t('welcome.language')}
            </p>
            <div className="space-y-2 mb-6">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                    lang === l.code
                      ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">{l.flag}</span>
                  <span className={`text-sm font-medium ${lang === l.code ? 'text-violet-700' : 'text-slate-700'}`}>
                    {l.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('currency')}
              className="w-full py-3 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition"
            >
              Next →
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
              {t('welcome.currency')}
            </p>
            <div className="space-y-2 mb-6">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                    currency === c.code
                      ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg font-bold text-slate-500 w-6 text-center">{c.symbol}</span>
                  <span className={`text-sm font-medium ${currency === c.code ? 'text-violet-700' : 'text-slate-700'}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('lang')}
                className="flex-1 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  try { localStorage.setItem('i18n_done', '1'); } catch {}
                  onComplete();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition"
              >
                {t('welcome.start')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
