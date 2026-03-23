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

const CHAIN_CFG: Record<string, { nameKey: string; color: string; bg: string; text: string; dot: string; url: string }> = {
  toxnfill: { nameKey: 'chain.toxnfill', color: '#7c3aed', bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-500', url: 'https://toxnfill.com' },
  uni:      { nameKey: 'chain.uni',      color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', url: 'https://uni114.co.kr' },
  daybeau:  { nameKey: 'chain.dayview',  color: '#ea580c', bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500', url: 'https://daybeauclinic.com' },
  vands:    { nameKey: 'chain.vands',    color: '#2563eb', bg: 'bg-blue-50',    text: 'text-blue-700', dot: 'bg-blue-500', url: 'https://vandsclinic.com' },
  ppeum:    { nameKey: 'chain.ppeum',    color: '#db2777', bg: 'bg-pink-50',    text: 'text-pink-700', dot: 'bg-pink-500', url: 'https://ppeum.co.kr' },
  drevers:  { nameKey: 'chain.evers',    color: '#d97706', bg: 'bg-amber-50',   text: 'text-amber-700', dot: 'bg-amber-500', url: 'https://drevers.co.kr' },
  evers:    { nameKey: 'chain.evers',    color: '#d97706', bg: 'bg-amber-50',   text: 'text-amber-700', dot: 'bg-amber-500', url: 'https://drevers.co.kr' },
  blivi:    { nameKey: 'chain.blivi',    color: '#e11d48', bg: 'bg-rose-50',    text: 'text-rose-700', dot: 'bg-rose-500', url: 'https://velyb.kr' },
};

const CHAIN_KEYS = Object.keys(CHAIN_CFG);

function getChainKey(clinicId: string): string | undefined {
  return CHAIN_KEYS.find(k => clinicId.startsWith(k));
}

function branchLabel(fullName: string, chainName: string): string {
  const cleaned = fullName.replace(chainName, '').replace(/의원\s*/, '').replace(/점$/, '').replace(/역점$/, '').trim();
  return cleaned || fullName;
}

// Toxnfill branch numbers: gangnam=1, apgujeong=2, konkuk=6, sinnonhyeon=9, gwanak=10, nowon=15, cheonho=17, songpa=29, gangseo=32, myeongdong=35, mia=39, mokdong=41, hongdae=50
const TOXNFILL_NUMS: Record<string, number> = { gangnam:1, apgujeong:2, konkuk:6, sinnonhyeon:9, gwanak:10, nowon:15, cheonho:17, songpa:29, gangseo:32, myeongdong:35, mia:39, mokdong:41, hongdae:50 };
const UNI_DOMAINS: Record<string, string> = { gangnam:'uni114.co.kr', seolleung:'sluni114.co.kr', jamsil:'jsuni114.co.kr', wangsimni:'wsnuni114.co.kr', myeongdong:'mduni114.co.kr', hongdae:'hduni114.co.kr', yeongdeungpo:'ydpuni114.co.kr', magok:'mguni114.co.kr', konkuk:'gduni114.co.kr', guro:'gruni114.co.kr', yeouido:'yduni114.co.kr', cheonho:'chuni114.co.kr', mokdong:'mdguni114.co.kr', changdong:'cduni114.co.kr' };
const BLIVI_PARAMS: Record<string, string> = { gangnam:'강남역점', konkuk:'건대점', nowon:'노원점', myeongdong:'명동점', mokdong:'목동점', balsan:'발산점', yeongdeungpo:'영등포점', yongsan:'용산점', jamsil:'잠실점', cheongnyangni:'청량리점', hongdae:'홍대점', cheongdam:'리저브청담점' };

function getBranchUrl(clinicId: string): string | null {
  const [chain, branch] = clinicId.includes('_') ? clinicId.split('_', 2) : [clinicId, ''];
  switch (chain) {
    case 'vands': return branch ? `https://${branch}.vandsclinic.co.kr` : null;
    case 'toxnfill': {
      const num = TOXNFILL_NUMS[branch];
      return num ? `https://toxnfill${num}.com` : 'https://toxnfill.com';
    }
    case 'daybeau': return branch ? `https://daybeauclinic${branch}.com` : null;
    case 'ppeum': return branch ? `https://${branch}.ppeum.com` : null;
    case 'drevers': return branch ? `https://evers${branch}.co.kr` : null;
    case 'blivi': {
      const param = BLIVI_PARAMS[branch];
      return param ? `https://m.velyb.kr/community/community01.php?tb=event2&etc5=${encodeURIComponent(param)}` : 'https://m.velyb.kr';
    }
    case 'uni': {
      const domain = UNI_DOMAINS[branch];
      return domain ? `https://${domain}` : 'https://uni114.co.kr';
    }
    default: return null;
  }
}

export default function Home() {
  const { t, tt, lang, currency, rateLabel, setLang, setCurrency } = useI18n();
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'clinics' | 'compare'>('clinics');
  const [activeClinicIdx, setActiveClinicIdx] = useState<number | null>(null);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);

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
    // Sort branches within each group by name ascending
    groups.forEach(g => g.branches.sort((a, b) => a.clinic.name.localeCompare(b.clinic.name, 'ko')));
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

  if (showWelcome === null) return null;
  if (showWelcome) return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
  if (!selectedDistrict) return <DistrictMap onSelect={setSelectedDistrict} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-sky-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 mt-3">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">{t('common.noData')}</p>
          <button onClick={() => setSelectedDistrict(null)} className="mt-3 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition">
            {t('common.backToMap')}
          </button>
        </div>
      </div>
    );
  }

  const districtLabel = t('district.' + selectedDistrict) || selectedDistrict;
  const langInfo = LANGS.find(l => l.code === lang);
  const curInfo = CURRENCIES.find(c => c.code === currency);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedDistrict(null)}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-400"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4L6 10L12 16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
              {districtLabel}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {chainGroups.map(g => g.name).join(' · ')}
            </p>
          </div>
          {/* Language/Currency badge */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 hover:bg-slate-100 transition text-xs"
            >
              <span>{langInfo?.flag}</span>
              <span className="font-medium text-slate-500">{curInfo?.symbol}{currency}</span>
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
                        className={`px-2 py-1 rounded text-xs transition ${lang === l.code ? 'bg-sky-50 text-sky-700 font-bold ring-1 ring-sky-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
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
                        className={`px-2 py-1 rounded text-xs transition ${currency === c.code ? 'bg-sky-50 text-sky-700 font-bold ring-1 ring-sky-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
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
          {(['clinics', 'compare'] as const).map(key => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                tab === key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('tab.' + key)}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 pb-32">
        {tab === 'clinics' ? (
          <>
            {/* Franchise-grouped clinic selector */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-3 mb-4 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">{t('common.selectClinic')}</p>
              <div className="space-y-1.5">
                {chainGroups.map(group => {
                  const cfg = group.cfg;
                  return (
                    <div key={group.key} className="bg-slate-50/70 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
                        <div className="flex items-center gap-1.5">
                          {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />}
                          <span className={`text-[12px] font-semibold ${cfg ? cfg.text : 'text-slate-600'}`}>{group.name}</span>
                        </div>
                        {group.branches.length > 1 && (
                          <span className="text-[11px] text-slate-300">{group.branches.length}</span>
                        )}
                      </div>
                      <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto hide-scrollbar">
                        {group.branches.map(({ clinic, idx }) => {
                          const isActive = activeClinicIdx === idx;
                          const label = branchLabel(clinic.name, group.name);
                          return (
                            <button
                              key={clinic.id}
                              onClick={() => setActiveClinicIdx(prev => prev === idx ? null : idx)}
                              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                isActive
                                  ? 'text-white shadow-sm'
                                  : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                              style={isActive && cfg ? { backgroundColor: cfg.color } : isActive ? { backgroundColor: '#334155' } : undefined}
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
            </div>
            {activeClinicIdx !== null ? (
              <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-200/80" />
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">{tt(clinics[activeClinicIdx].name)}</span>
                <div className="flex-1 h-px bg-slate-200/80" />
              </div>
              <ClinicView
                clinic={clinics[activeClinicIdx]}
                toggleCompare={toggleCompare}
                isChecked={isChecked}
                branchUrl={getBranchUrl(clinics[activeClinicIdx].id)}
                chainColor={(() => { const ck = getChainKey(clinics[activeClinicIdx].id); return ck ? CHAIN_CFG[ck].color : null; })()}
              />
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400">{t('common.selectClinic')}</p>
              </div>
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
