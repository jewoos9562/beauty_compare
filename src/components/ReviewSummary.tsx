'use client';

import { useI18n } from '@/context/I18nContext';

type ReviewData = {
  rating: number | null;
  total: number;
  stars: Record<string, number> | null;
  summary?: string;
  pros?: string[];
  cons?: string[];
  keywords?: string[];
  bestFor?: string;
};

type Props = {
  clinicId: string;
  clinicName: string;
  clinicAddress: string;
  reviewData: ReviewData | null;
};

function StarBar({ star, count, max }: { star: number; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-400 w-3 text-right">{star}</span>
      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-300 w-6 text-right">{count}</span>
    </div>
  );
}

export default function ReviewSummary({ clinicId, clinicName, clinicAddress, reviewData }: Props) {
  const { t } = useI18n();

  if (!reviewData) return null;

  const { rating, total, stars, summary, pros, cons, keywords, bestFor } = reviewData;
  const maxStarCount = stars ? Math.max(...Object.values(stars), 1) : 1;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicName + ' ' + clinicAddress)}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 mb-4">
      {/* Rating header */}
      <div className="flex items-start gap-4 mb-3">
        <div className="text-center">
          <p className="text-3xl font-bold text-slate-800">{rating ?? '—'}</p>
          <div className="flex gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <svg key={s} className={`w-3.5 h-3.5 ${rating && s <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-sky-500 hover:text-sky-600 mt-1 inline-block"
          >
            {t('review.googleReviews', { count: String(total) })}
          </a>
        </div>

        {/* Star distribution */}
        {stars && (
          <div className="flex-1 space-y-0.5">
            {[5, 4, 3, 2, 1].map(s => (
              <StarBar key={s} star={s} count={stars[String(s)] || 0} max={maxStarCount} />
            ))}
          </div>
        )}
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">AI {t('review.summary')}</span>
            <span className="text-[9px] text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">Claude Sonnet</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{summary}</p>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {pros && pros.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-emerald-600 mb-1">{t('review.pros')}</p>
                <ul className="space-y-0.5">
                  {pros.map((p, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cons && cons.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-rose-500 mb-1">{t('review.cons')}</p>
                <ul className="space-y-0.5">
                  {cons.map((c, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-rose-400 mt-0.5 shrink-0">−</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Keywords */}
          {keywords && keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keywords.map((k, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium">
                  {k}
                </span>
              ))}
            </div>
          )}

          {/* Best for */}
          {bestFor && (
            <p className="text-[11px] text-slate-400 italic">
              {t('review.bestFor')}: {bestFor}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
