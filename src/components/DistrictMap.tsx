'use client';

type District = {
  name: string;
  id: string;
  row: number;
  col: number;
  active: boolean;
  clinicCount?: number;
};

const DISTRICTS: District[] = [
  // Row 0
  { name: '도봉구', id: 'dobong', row: 0, col: 3, active: false },
  { name: '노원구', id: 'nowon', row: 0, col: 4, active: false },
  // Row 1
  { name: '은평구', id: 'eunpyeong', row: 1, col: 1, active: false },
  { name: '강북구', id: 'gangbuk', row: 1, col: 2, active: false },
  { name: '성북구', id: 'seongbuk', row: 1, col: 3, active: false },
  { name: '중랑구', id: 'jungnang', row: 1, col: 5, active: false },
  // Row 2
  { name: '서대문구', id: 'seodaemun', row: 2, col: 0, active: false },
  { name: '종로구', id: 'jongno', row: 2, col: 1, active: false },
  { name: '동대문구', id: 'dongdaemun', row: 2, col: 3, active: false },
  { name: '광진구', id: 'gwangjin', row: 2, col: 4, active: true, clinicCount: 3 },
  // Row 3
  { name: '마포구', id: 'mapo', row: 3, col: 0, active: false },
  { name: '중구', id: 'jung', row: 3, col: 1, active: false },
  { name: '성동구', id: 'seongdong', row: 3, col: 3, active: false },
  { name: '용산구', id: 'yongsan', row: 3, col: 2, active: false },
  // Row 4
  { name: '강서구', id: 'gangseo', row: 4, col: 0, active: false },
  { name: '양천구', id: 'yangcheon', row: 4, col: 1, active: false },
  { name: '영등포구', id: 'yeongdeungpo', row: 4, col: 2, active: false },
  { name: '동작구', id: 'dongjak', row: 4, col: 3, active: false },
  { name: '서초구', id: 'seocho', row: 4, col: 4, active: false },
  { name: '강남구', id: 'gangnam', row: 4, col: 5, active: false },
  // Row 5
  { name: '구로구', id: 'guro', row: 5, col: 1, active: false },
  { name: '금천구', id: 'geumcheon', row: 5, col: 2, active: false },
  { name: '관악구', id: 'gwanak', row: 5, col: 3, active: false },
  { name: '송파구', id: 'songpa', row: 5, col: 5, active: false },
  { name: '강동구', id: 'gangdong', row: 5, col: 6, active: false },
];

type Props = {
  onSelect: (districtId: string) => void;
};

export default function DistrictMap({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            피부과 가격 비교
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            지역을 선택하세요
          </p>
        </div>
      </header>

      {/* Map grid */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: 6 * 7 }, (_, i) => {
            const row = Math.floor(i / 7);
            const col = i % 7;
            const district = DISTRICTS.find(d => d.row === row && d.col === col);

            if (!district) {
              return <div key={i} />;
            }

            return (
              <button
                key={district.id}
                onClick={() => district.active && onSelect(district.id)}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center
                  text-[10px] sm:text-xs font-semibold transition-all duration-200
                  ${district.active
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:scale-105 hover:shadow-xl cursor-pointer ring-2 ring-violet-300 ring-offset-2'
                    : 'bg-slate-100 text-slate-400 cursor-default'
                  }
                `}
              >
                <span className="leading-tight">{district.name.replace('구', '')}</span>
                <span className="leading-tight">구</span>
                {district.active && district.clinicCount && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {district.clinicCount}
                  </span>
                )}
                {!district.active && (
                  <span className="absolute bottom-0.5 text-[7px] sm:text-[8px] text-slate-300 font-normal">
                    준비중
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gradient-to-br from-violet-500 to-indigo-600" />
            데이터 있음
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
            준비중
          </div>
        </div>

        {/* Info card */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-sm font-semibold text-slate-700">현재 제공 지역</p>
          <p className="text-lg font-bold text-violet-600 mt-1">광진구 (건대입구역)</p>
          <p className="text-xs text-slate-400 mt-1">톡스앤필 · 유앤아이 · 데이뷰 — 3개 병원 비교</p>
          <button
            onClick={() => onSelect('gwangjin')}
            className="mt-3 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow hover:shadow-lg transition-all hover:scale-[1.02]"
          >
            광진구 가격 비교 보기
          </button>
        </div>
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-400">
        가격 정보는 각 병원 홈페이지 기준이며, 실제와 다를 수 있습니다
      </footer>
    </div>
  );
}
