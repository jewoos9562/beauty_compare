'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Clinic } from '@/data/clinics';
import { fetchClinics } from '@/lib/fetch-clinics';
import DistrictMap from '@/components/DistrictMap';
import ClinicView from '@/components/ClinicView';
import CrossCompare from '@/components/CrossCompare';
import CompareDrawer from '@/components/CompareDrawer';

export type CompareItem = {
  clinicName: string;
  itemName: string;
  price: number;
  categoryName: string;
};

export default function Home() {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'clinics' | 'compare'>('clinics');
  const [activeClinicIdx, setActiveClinicIdx] = useState(0);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);

  // Fetch clinics from Supabase when district is selected
  useEffect(() => {
    if (!selectedDistrict) return;
    setLoading(true);
    fetchClinics(selectedDistrict)
      .then(data => {
        setClinics(data);
        setActiveClinicIdx(0);
      })
      .catch(err => console.error('Failed to fetch clinics:', err))
      .finally(() => setLoading(false));
  }, [selectedDistrict]);

  const toggleCompare = useCallback((item: CompareItem) => {
    setCompareList(prev => {
      const key = `${item.clinicName}|${item.itemName}|${item.price}`;
      const exists = prev.find(
        c => `${c.clinicName}|${c.itemName}|${c.price}` === key
      );
      if (exists) return prev.filter(c => `${c.clinicName}|${c.itemName}|${c.price}` !== key);
      return [...prev, item];
    });
  }, []);

  const isChecked = useCallback(
    (item: CompareItem) =>
      compareList.some(
        c =>
          c.clinicName === item.clinicName &&
          c.itemName === item.itemName &&
          c.price === item.price
      ),
    [compareList]
  );

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
          <p className="text-sm text-slate-500 mt-3">데이터 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // No data
  if (clinics.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">해당 지역 데이터가 없습니다</p>
          <button
            onClick={() => setSelectedDistrict(null)}
            className="mt-3 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg"
          >
            지도로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const CHAIN_CFG: Record<string, { name: string; border: string; badge: string; pill: string }> = {
    toxnfill: { name: '톡스앤필', border: 'border-l-violet-500', badge: 'bg-violet-100 text-violet-700', pill: 'bg-violet-600' },
    uni:      { name: '유앤아이', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-600' },
    dayview:  { name: '데이뷰', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', pill: 'bg-orange-500' },
    vands:    { name: '밴스', border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700', pill: 'bg-blue-600' },
    ppeum:    { name: '예쁨주의쁨', border: 'border-l-pink-500', badge: 'bg-pink-100 text-pink-700', pill: 'bg-pink-500' },
    evers:    { name: '닥터에버스', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', pill: 'bg-amber-500' },
    blivi:    { name: '블리비', border: 'border-l-rose-500', badge: 'bg-rose-100 text-rose-700', pill: 'bg-rose-500' },
  };

  const chainGroups = useMemo(() => {
    const groups: { key: string; name: string; cfg: typeof CHAIN_CFG[string] | null; branches: { clinic: Clinic; idx: number }[] }[] = [];
    const map = new Map<string, typeof groups[0]>();
    clinics.forEach((clinic, idx) => {
      const chainKey = Object.keys(CHAIN_CFG).find(k => clinic.id.startsWith(k));
      const key = chainKey ?? `_${clinic.id}`;
      if (!map.has(key)) {
        const g = { key, name: chainKey ? CHAIN_CFG[chainKey].name : clinic.name, cfg: chainKey ? CHAIN_CFG[chainKey] : null, branches: [] as typeof groups[0]['branches'] };
        map.set(key, g);
        groups.push(g);
      }
      map.get(key)!.branches.push({ clinic, idx });
    });
    return groups;
  }, [clinics]);

  const branchLabel = (fullName: string, chainName: string): string => {
    const cleaned = fullName.replace(chainName, '').replace(/의원\s*/, '').trim();
    return cleaned || fullName;
  };

  const districtNames: Record<string, string> = { gwangjin: '광진구', seongdong: '성동구', gangnam: '강남구' };
  const districtLabel = districtNames[selectedDistrict] ?? selectedDistrict;
  const subtitle = chainGroups.map(g => g.name).join(' · ') + ` — ${clinics.length}개 지점`;

  // District detail page
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedDistrict(null)}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-500"
            aria-label="뒤로가기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4L6 10L12 16" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {districtLabel} 피부과 가격 비교
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-2">
          <button
            onClick={() => setTab('clinics')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              tab === 'clinics'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            병원별 보기
          </button>
          <button
            onClick={() => setTab('compare')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              tab === 'compare'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            시술별 비교
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
                  <div
                    key={group.key}
                    className={`bg-white rounded-xl border border-slate-200 border-l-4 ${border} overflow-hidden`}
                  >
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
                        {group.name}
                      </span>
                      {group.branches.length > 1 && (
                        <span className="text-[11px] text-slate-400">{group.branches.length}개 지점</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto hide-scrollbar">
                      {group.branches.map(({ clinic, idx }) => {
                        const isActive = activeClinicIdx === idx;
                        const label = group.branches.length > 1
                          ? branchLabel(clinic.name, group.name)
                          : branchLabel(clinic.name, group.name);

                        return (
                          <button
                            key={clinic.id}
                            onClick={() => setActiveClinicIdx(idx)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              isActive
                                ? `${pillActive} text-white shadow-sm`
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <ClinicView
              clinic={clinics[activeClinicIdx]}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          </>
        ) : (
          <CrossCompare
            clinics={clinics}
            toggleCompare={toggleCompare}
            isChecked={isChecked}
          />
        )}
      </main>

      {/* Compare drawer */}
      {compareList.length > 0 && (
        <CompareDrawer
          items={compareList}
          onRemove={(item) => toggleCompare(item)}
          onClear={() => setCompareList([])}
        />
      )}
    </div>
  );
}
