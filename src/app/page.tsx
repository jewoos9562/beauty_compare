'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Clinic } from '@/data/clinics';
import { fetchClinics } from '@/lib/fetch-clinics';
import { useI18n } from '@/context/I18nContext';
import { LANGS, CURRENCIES } from '@/i18n/translations';
import DistrictMap from '@/components/DistrictMap';
import ClinicView from '@/components/ClinicView';
import CrossCompare from '@/components/CrossCompare';
import CompareDrawer from '@/components/CompareDrawer';
import WelcomeScreen from '@/components/WelcomeScreen';

export type CompareItem = {
  clinicName: string;
  itemName: string;
  price: number;
  categoryName: string;
};

const CHAIN_CFG: Record<string, { nameKey: string; border: string; badge: string; pill: string; url: string }> = {
  toxnfill: { nameKey: 'chain.toxnfill', border: 'border-l-violet-500', badge: 'bg-violet-100 text-violet-700', pill: 'bg-violet-600', url: 'https://toxnfill.com' },
  uni:      { nameKey: 'chain.uni', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-600', url: 'https://uni114.co.kr' },
  dayview:  { nameKey: 'chain.dayview', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', pill: 'bg-orange-500', url: 'https://daybeauclinic.com' },
  vands:    { nameKey: 'chain.vands', border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700', pill: 'bg-blue-600', url: 'https://vandsclinic.com' },
  ppeum:    { nameKey: 'chain.ppeum', border: 'border-l-pink-500', badge: 'bg-pink-100 text-pink-700', pill: 'bg-pink-500', url: 'https://ppeum.co.kr' },
  evers:    { nameKey: 'chain.evers', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', pill: 'bg-amber-500', url: 'https://drevers.co.kr' },
  blivi:    { nameKey: 'chain.blivi', border: 'border-l-rose-500', badge: 'bg-rose-100 text-rose-700', pill: 'bg-rose-500', url: 'https://velyb.kr' },
};

const CHAIN_KEYS = Object.keys(CHAIN_CFG);

function getChainKey(clinicId: string): string | undefined {
  return CHAIN_KEYS.find(k => clinicId.startsWith(k));
}

function branchLabel(fullName: string, chainName: string): string {
  const cleaned = fullName.replace(chainName, '').replace(/의원\s*/, '').replace(/점$/, '').replace(/역점$/, '').trim();
  return cleaned || fullName;
}

export default function Home() {
  const { t, tt, lang, currency, rateLabel, setLang, setCurrency } = useI18n();
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null); // null = checking
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'clinics' | 'compare'>('clinics');
  const [activeClinicIdx, setActiveClinicIdx] = useState<number | null>(null);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Check if user has completed welcome
  useEffect(() => {
    try {
      setShowWelcome(!localStorage.getItem('i18n_done'));
    } catch {
      setShowWelcome(false);
    }
  }, []);

  const chainGroups = useMemo(() => {
    const groups: { key: string; name: string; cfg: typeof CHAIN_CFG[string] | null; branches: { clinic: Clinic; idx: number }[] }[] = [];
    const map = new Map<string, typeof groups[0]>();
    clinics.forEach((clinic, idx) => {
      const chainKey = getChainKey(clinic.id);
      const key = chainKey ?? `_${clinic.id}`;
      if (!map.has(key)) {
        const g = { key, name: chainKey ? t(CHAIN_CFG[chainKey].nameKey) : clinic.name, cfg: chainKey ? CHAIN_CFG[chainKey] : null, branches: [] as typeof groups[0]['branches'] };
        map.set(key, g);
        groups.push(g);
      }
      map.get(key)!.branches.push({ clinic, idx });
    });
    return groups;
  }, [clinics, t]);

  useEffect(() => {
    if (!selectedDistrict) return;
    setLoading(true);
    fetchClinics(selectedDistrict)
      .then(data => {
        setClinics(data);
        setActiveClinicIdx(null);
      })
      .catch(err => console.error('Failed to fetch clinics:', err))
      .finally(() => setLoading(false));
  }, [selectedDistrict]);

  const toggleCompare = useCallback((item: CompareItem) => {
    setCompareList(prev => {
      const key = `${item.clinicName}|${item.itemName}|${item.price}`;
      const exists = prev.find(c => `${c.clinicName}|${c.itemName}|${c.price}` === key);
      if (exists) return prev.filter(c => `${c.clinicName}|${c.itemName}|${c.price}` !== key);
      return [...prev, item];
    });
  }, []);

  const isChecked = useCallback(
    (item: CompareItem) =>
      compareList.some(c => c.clinicName === item.clinicName && c.itemName === item.itemName && c.price === item.price),
    [compareList]
  );

  // Still checking localStorage
  if (showWelcome === null) return null;

  // Welcome screen
  if (showWelcome) {
    return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
  }

  // Landing page — district map
  if (!selectedDistrict) {
    return <DistrictMap onSelect={setSelectedDistrict} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-slate-300 border-t-violet-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-3">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // No data
  if (clinics.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">{t('common.noData')}</p>
          <button onClick={() => setSelectedDistrict(null)} className="mt-3 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg">
            {t('common.backToMap')}
          </button>
        </div>
      </div>
    );
  }

  const districtLabel = t('district.' + selectedDistrict) || selectedDistrict;
  const subtitle = chainGroups.map(g => g.name).join(' · ') + ` — ${t('common.branches', { count: String(clinics.length) })}`;
  const langInfo = LANGS.find(l => l.code === lang);
  const curInfo = CURRENCIES.find(c => c.code === currency);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedDistrict(null)}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-500"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4L6 10L12 16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 truncate">
              {t('header.districtCompare', { district: districtLabel })}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
          </div>
          {/* Language/Currency badge */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-xs"
            >
              <span>{langInfo?.flag}</span>
              <span className="font-medium text-slate-600">{curInfo?.symbol}{currency}</span>
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3 w-56">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">{t('welcome.language')}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {LANGS.map(l => (
                      <button
                        key={l.code}
                        onClick={() => setLang(l.code)}
                        className={`px-2 py-1 rounded text-xs transition ${lang === l.code ? 'bg-violet-100 text-violet-700 font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        data-lang={l.code}
                      >
                        {l.flag} {l.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">{t('welcome.currency')}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {CURRENCIES.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setCurrency(c.code)}
                        className={`px-2 py-1 rounded text-xs transition ${currency === c.code ? 'bg-violet-100 text-violet-700 font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        data-cur={c.code}
                      >
                        {c.symbol} {c.code}
                      </button>
                    ))}
                  </div>
                  {rateLabel && (
                    <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                      {t('header.exchangeRate')}: {rateLabel}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-2">
          <button
            onClick={() => setTab('clinics')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === 'clinics' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t('tab.clinics')}
          </button>
          <button
            onClick={() => setTab('compare')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === 'compare' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t('tab.compare')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 pb-32">
        {tab === 'clinics' ? (
          <>
            {/* Franchise-grouped clinic selector */}
            <div className="space-y-2 mb-4">
              {chainGroups.map(group => {
                const border = group.cfg?.border ?? 'border-l-slate-400';
                const badge = group.cfg?.badge ?? 'bg-slate-100 text-slate-600';
                const pillActive = group.cfg?.pill ?? 'bg-slate-700';

                return (
                  <div key={group.key} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${border} overflow-hidden`}>
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{group.name}</span>
                      {group.cfg?.url && (
                        <a href={group.cfg.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 transition" title={t('common.officialSite')}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                      {group.branches.length > 1 && (
                        <span className="text-[11px] text-slate-400">{t('common.branches', { count: String(group.branches.length) })}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto hide-scrollbar">
                      {group.branches.map(({ clinic, idx }) => {
                        const isActive = activeClinicIdx === idx;
                        const label = branchLabel(clinic.name, group.name);
                        return (
                          <button
                            key={clinic.id}
                            onClick={() => setActiveClinicIdx(prev => prev === idx ? null : idx)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isActive ? `${pillActive} text-white shadow-sm` : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                          >
                            {tt(label)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {activeClinicIdx !== null ? (
              <ClinicView clinic={clinics[activeClinicIdx]} toggleCompare={toggleCompare} isChecked={isChecked} />
            ) : (
              <p className="text-center text-slate-400 py-8 text-sm">{t('common.selectClinic')}</p>
            )}
          </>
        ) : (
          <CrossCompare clinics={clinics} toggleCompare={toggleCompare} isChecked={isChecked} />
        )}
      </main>

      {compareList.length > 0 && (
        <CompareDrawer items={compareList} onRemove={(item) => toggleCompare(item)} onClear={() => setCompareList([])} />
      )}
    </div>
  );
}

