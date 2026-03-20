'use client';

import { useState, useCallback, useEffect } from 'react';
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

  const districtNames: Record<string, string> = { gwangjin: '광진구', seongdong: '성동구', gangnam: '강남구' };
  const districtLabel = districtNames[selectedDistrict] ?? selectedDistrict;
  const subtitle = clinics.map(c => c.name.replace(/ 건대.*/, '')).join(' · ');

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
            {/* Clinic selector pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
              {clinics.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveClinicIdx(i)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                    activeClinicIdx === i
                      ? 'bg-gradient-to-r text-white border-transparent ' + c.color
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {c.name}
                </button>
              ))}
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
