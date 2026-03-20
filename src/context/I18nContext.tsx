'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { translations, FALLBACK_RATES } from '@/i18n/translations';
import type { Lang, Currency } from '@/i18n/translations';

type I18nCtx = {
  lang: Lang;
  currency: Currency;
  setLang: (l: Lang) => void;
  setCurrency: (c: Currency) => void;
  t: (key: string, vars?: Record<string, string>) => string;
  fmtPrice: (krw: number | null | undefined) => string;
  rates: Record<Currency, number>;
  rateLabel: string; // e.g. "1 USD = 1,380 KRW"
  ready: boolean;
};

const Ctx = createContext<I18nCtx | null>(null);

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');
  const [currency, setCurrencyState] = useState<Currency>('KRW');
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);
  const [ready, setReady] = useState(false);

  // Load saved prefs
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('i18n_lang') as Lang | null;
      const savedCur = localStorage.getItem('i18n_currency') as Currency | null;
      if (savedLang && translations[savedLang]) setLangState(savedLang);
      if (savedCur && FALLBACK_RATES[savedCur] !== undefined) setCurrencyState(savedCur);
    } catch {}
  }, []);

  // Fetch exchange rates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/KRW');
        const data = await res.json();
        if (!cancelled && data.rates) {
          // API returns rates FROM KRW, e.g. KRW→USD = 0.000725
          // We need: how many KRW per 1 unit of target currency
          const r: Record<Currency, number> = {
            KRW: 1,
            USD: Math.round(1 / data.rates.USD),
            EUR: Math.round(1 / data.rates.EUR),
            JPY: +(1 / data.rates.JPY).toFixed(2),
            CNY: Math.round(1 / data.rates.CNY),
          };
          setRates(r);
        }
      } catch {
        // keep fallback rates
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('i18n_lang', l); } catch {}
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem('i18n_currency', c); } catch {}
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string>) => {
    let str = translations[lang]?.[key] ?? translations.ko[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  }, [lang]);

  const fmtPrice = useCallback((krw: number | null | undefined) => {
    if (krw == null) return '-';
    if (currency === 'KRW') return krw.toLocaleString('ko-KR') + '원';
    const converted = krw / rates[currency];
    const symbols: Record<string, string> = { USD: '$', EUR: '€', JPY: '¥', CNY: '¥' };
    const decimals = currency === 'JPY' ? 0 : 2;
    return symbols[currency] + converted.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }, [currency, rates]);

  const rateLabel = useMemo(() => {
    if (currency === 'KRW') return '';
    const symbols: Record<string, string> = { USD: '$', EUR: '€', JPY: '¥', CNY: '¥' };
    return `1 ${symbols[currency]}${currency === 'JPY' ? '100' : '1'} = ₩${currency === 'JPY' ? (rates.JPY * 100).toLocaleString() : rates[currency].toLocaleString()}`;
  }, [currency, rates]);

  const value = useMemo(
    () => ({ lang, currency, setLang, setCurrency, t, fmtPrice, rates, rateLabel, ready }),
    [lang, currency, setLang, setCurrency, t, fmtPrice, rates, rateLabel, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
