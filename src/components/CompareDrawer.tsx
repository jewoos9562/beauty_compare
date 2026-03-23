'use client';

import { useState } from 'react';
import type { CompareItem } from '@/app/page';
import { useI18n } from '@/context/I18nContext';

type Props = {
  items: CompareItem[];
  onRemove: (item: CompareItem) => void;
  onClear: () => void;
};

export default function CompareDrawer({ items, onRemove, onClear }: Props) {
  const { t, tt, fmtPrice } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Collapsed bar */}
      <div
        className="bg-slate-900 text-white max-w-4xl mx-auto rounded-t-2xl shadow-2xl cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {items.length}
            </span>
            <span className="text-sm font-medium text-slate-200">{t('compare.list')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">{fmtPrice(total)}</span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="bg-white max-w-4xl mx-auto border-x border-slate-200 shadow-2xl max-h-[60vh] overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400">{tt(item.clinicName)}</p>
                  <p className="text-sm text-slate-700 truncate">{tt(item.itemName)}</p>
                </div>
                <p className="text-sm font-semibold text-slate-800 shrink-0">{fmtPrice(item.price)}</p>
                <button
                  onClick={() => onRemove(item)}
                  className="text-slate-300 hover:text-red-500 transition shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-between items-center">
            <button
              onClick={onClear}
              className="text-xs text-slate-400 hover:text-red-500 font-medium transition"
            >
              {t('compare.clearAll')}
            </button>
            <p className="text-sm font-bold text-slate-900">
              {t('compare.total', { price: fmtPrice(total) ?? '' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
