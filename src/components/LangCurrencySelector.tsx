'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/context/I18nContext';
import { LANGS, CURRENCIES } from '@/i18n/translations';

export default function LangCurrencySelector() {
  const { lang, currency, setLang, setCurrency } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = LANGS.find((l) => l.code === lang);
  const currentCurrency = CURRENCIES.find((c) => c.code === currency);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-slate-100 transition-colors"
      >
        <span>{currentLang?.flag}</span>
        <span className="hidden sm:inline">{currentLang?.label}</span>
        <span className="text-[var(--border)]">|</span>
        <span>{currentCurrency?.symbol}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[var(--border)] shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-[var(--border)]">
            <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase tracking-wider mb-2">언어 / Language</div>
            <div className="grid grid-cols-2 gap-1">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    lang === l.code
                      ? 'bg-[var(--primary)] text-white'
                      : 'hover:bg-slate-50 text-[var(--text)]'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <div className="text-[10px] font-semibold text-[var(--text-light)] uppercase tracking-wider mb-2">통화 / Currency</div>
            <div className="grid grid-cols-2 gap-1">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    currency === c.code
                      ? 'bg-[var(--primary)] text-white'
                      : 'hover:bg-slate-50 text-[var(--text)]'
                  }`}
                >
                  <span>{c.symbol}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
