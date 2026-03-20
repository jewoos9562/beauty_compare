'use client';

import { useState, useCallback } from 'react';
import { CLINICS } from '@/data/clinics';
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
  const [tab, setTab] = useState<'clinics' | 'compare'>('clinics');
  const [activeClinicIdx, setActiveClinicIdx] = useState(0);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-slate-800">
            건대 피부과 가격 비교
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            톡스앤필 · 유앤아이 · 데이뷰
          </p>
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
              {CLINICS.map((c, i) => (
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
              clinic={CLINICS[activeClinicIdx]}
              toggleCompare={toggleCompare}
              isChecked={isChecked}
            />
          </>
        ) : (
          <CrossCompare
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
