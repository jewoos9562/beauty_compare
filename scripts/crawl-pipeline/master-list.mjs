/**
 * 시술 마스터 리스트 (beauty_compare_시술분류.xlsx - 260326 기반)
 * 대분류 · 중분류(tag) · 시술명 · 목적(키워드) · area · 단위 · 표준명(EN)
 *
 * 목적(키워드)의 "/" = OR (예: "지방/리프팅" → 지방 또는 리프팅)
 */

export const MASTER_LIST = [
  // ══════════════════════════════════════════════════════════════
  // 리프팅
  // ══════════════════════════════════════════════════════════════
  // ── 레이저 리프팅 ──
  { major: '리프팅', sub: '레이저 리프팅', name: '울쎄라', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '울쎄라 프라임', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '슈링크', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '슈링크 유니버스', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '리프테라', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '리니어지', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: '' },
  { major: '리프팅', sub: '레이저 리프팅', name: '쿨소닉', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이슈링크', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '눈', unit: '샷', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '소프웨이브', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Parallel Beam Ultrasound' },
  { major: '리프팅', sub: '레이저 리프팅', name: '세르프', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: '' },
  { major: '리프팅', sub: '레이저 리프팅', name: '써마지 FLX', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '올리지오', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '포텐자 다이아', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: '' },
  { major: '리프팅', sub: '레이저 리프팅', name: '튠페이스', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '볼뉴머', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FORMA', purpose: '탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이써마지', purpose: '탄력/주름', area: '얼굴', areaDetail: '눈', unit: '샷', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이볼뉴머', purpose: '탄력/주름', area: '얼굴', areaDetail: '눈', unit: '샷', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이올리지오', purpose: '탄력/주름', area: '얼굴', areaDetail: '눈', unit: '샷', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FX', purpose: '지방', area: '얼굴', areaDetail: '얼굴 전체', unit: '전체/부위', en: 'Multi-Mode Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FX+FORMA', purpose: '지방/탄력/주름/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Multi-Mode Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '온다', purpose: '지방/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: 'kJ', en: 'Microwave Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '티타늄', purpose: '탄력/리프팅/미백', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Laser Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '덴서티', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'RF Lifting' },

  // ── 실 리프팅 ──
  { major: '리프팅', sub: '실 리프팅', name: '실 리프팅', purpose: '리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '줄', en: 'Thread Lift' },
  { major: '리프팅', sub: '실 리프팅', name: '잼버 (눈밑)', purpose: '볼륨/다크서클', area: '얼굴', areaDetail: '눈밑', unit: '줄', en: 'Thread Lift' },
  { major: '리프팅', sub: '실 리프팅', name: '잼버 (팔자)', purpose: '주름', area: '얼굴', areaDetail: '팔자', unit: '줄', en: 'Thread Lift' },

  // ══════════════════════════════════════════════════════════════
  // 필러
  // ══════════════════════════════════════════════════════════════
  // ── 얼굴 필러 ──
  { major: '필러', sub: '얼굴 필러', name: '팔자 필러', purpose: '주름', area: '얼굴', areaDetail: '팔자', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '입술 필러', purpose: '볼륨', area: '얼굴', areaDetail: '입술/입꼬리', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '코 필러', purpose: '볼륨', area: '얼굴', areaDetail: '코', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '귀 필러', purpose: '볼륨', area: '얼굴', areaDetail: '귓볼/귓바퀴', unit: '', en: '' },
  { major: '필러', sub: '얼굴 필러', name: '턱끝 필러', purpose: '볼륨', area: '얼굴', areaDetail: '턱끝', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '옆볼 필러', purpose: '볼륨', area: '얼굴', areaDetail: '옆볼', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '앞볼 필러', purpose: '볼륨', area: '얼굴', areaDetail: '앞볼', unit: 'cc', en: '' },
  { major: '필러', sub: '얼굴 필러', name: '이마 필러', purpose: '볼륨', area: '얼굴', areaDetail: '이마', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '관자 필러', purpose: '볼륨', area: '얼굴', areaDetail: '관자', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '마리오네트 필러', purpose: '주름', area: '얼굴', areaDetail: '마리오네트', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '목주름 필러', purpose: '주름', area: '얼굴', areaDetail: '목', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '눈밑 필러', purpose: '볼륨', area: '얼굴', areaDetail: '눈밑', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '애교살 필러', purpose: '볼륨', area: '얼굴', areaDetail: '눈밑', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '눈물고랑 필러', purpose: '볼륨', area: '얼굴', areaDetail: '눈밑', unit: 'cc', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '스컬트라', purpose: '볼륨', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'Biostimulator' },
  { major: '필러', sub: '얼굴 필러', name: '쥬베룩 볼륨', purpose: '볼륨', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc/vial', en: 'Biostimulator' },
  { major: '필러', sub: '얼굴 필러', name: '래디어스', purpose: '볼륨', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'Biostimulator' },

  // ── 바디 필러 ──
  { major: '필러', sub: '바디 필러', name: '어깨 필러', purpose: '볼륨', area: '바디', areaDetail: '어깨', unit: '', en: 'Dermal Filler' },
  { major: '필러', sub: '바디 필러', name: '쇄골 필러', purpose: '볼륨', area: '바디', areaDetail: '쇄골', unit: '', en: 'Dermal Filler' },
  { major: '필러', sub: '바디 필러', name: '힙딥/골반 필러', purpose: '볼륨', area: '바디', areaDetail: '엉덩이', unit: '', en: 'Dermal Filler' },

  // ══════════════════════════════════════════════════════════════
  // 보톡스
  // ══════════════════════════════════════════════════════════════
  { major: '보톡스', sub: '얼굴 보톡스', name: '이마 보톡스', purpose: '주름', area: '얼굴', areaDetail: '이마', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '미간 보톡스', purpose: '주름', area: '얼굴', areaDetail: '미간', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '눈가 보톡스', purpose: '주름', area: '얼굴', areaDetail: '눈가', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '눈밑 보톡스', purpose: '주름', area: '얼굴', areaDetail: '눈밑', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '눈썹 보톡스', purpose: '주름', area: '얼굴', areaDetail: '눈썹', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '콧등 보톡스', purpose: '주름', area: '얼굴', areaDetail: '콧등', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '입술 보톡스', purpose: '주름', area: '얼굴', areaDetail: '입술', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '입꼬리 보톡스', purpose: '주름', area: '얼굴', areaDetail: '입꼬리', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '팔자 보톡스', purpose: '주름', area: '얼굴', areaDetail: '팔자', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '자갈턱 보톡스', purpose: '주름', area: '얼굴', areaDetail: '자갈턱', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '사각턱 보톡스', purpose: '근육', area: '얼굴', areaDetail: '사각턱', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '침샘 보톡스', purpose: '침샘', area: '얼굴', areaDetail: '침샘', unit: '', en: '' },
  { major: '보톡스', sub: '바디 보톡스', name: '겨드랑이 다한증 보톡스', purpose: '다한증', area: '바디', areaDetail: '겨드랑이', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '바디 보톡스', name: '손/발 다한증 보톡스', purpose: '다한증', area: '바디', areaDetail: '손/발', unit: '', en: '' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '스킨 보톡스', purpose: '모공', area: '얼굴', areaDetail: '전체얼굴', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '목주름 보톡스', purpose: '주름', area: '얼굴', areaDetail: '목', unit: '', en: '' },
  { major: '보톡스', sub: '바디 보톡스', name: '승모근 보톡스', purpose: '근육', area: '바디', areaDetail: '승모근', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '바디 보톡스', name: '종아리 보톡스', purpose: '근육', area: '바디', areaDetail: '종아리', unit: '', en: 'Botox' },
  { major: '보톡스', sub: '바디 보톡스', name: '허벅지 보톡스', purpose: '근육', area: '바디', areaDetail: '허벅지', unit: '', en: '' },

  // ══════════════════════════════════════════════════════════════
  // 피부
  // ══════════════════════════════════════════════════════════════
  // ── 미백/토닝 ──
  { major: '피부', sub: '미백/토닝', name: '토닝 레이저', purpose: '미백/색소', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Toning Laser' },
  { major: '피부', sub: '미백/토닝', name: '바디 토닝 레이저', purpose: '미백/색소', area: '바디', areaDetail: '', unit: '', en: '' },
  { major: '피부', sub: '미백/토닝', name: '피코 토닝', purpose: '미백/색소', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Pico Laser' },
  { major: '피부', sub: '미백/토닝', name: '바디 피코 토닝', purpose: '미백/색소', area: '바디', areaDetail: '', unit: '', en: '' },
  { major: '피부', sub: '미백/토닝', name: '리팟 레이저', purpose: '색소', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: '' },
  { major: '피부', sub: '미백/토닝', name: 'IPL', purpose: '미백', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Toning Laser' },
  { major: '피부', sub: '미백/토닝', name: '홍조 레이저', purpose: '홍조/혈관', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: '' },
  { major: '피부', sub: '미백/토닝', name: '태반주사', purpose: '', area: '전신', areaDetail: '', unit: '', en: '' },
  { major: '피부', sub: '미백/토닝', name: '백옥주사', purpose: '미백', area: '전신', areaDetail: '전신', unit: '', en: 'Brightening Injection' },
  { major: '피부', sub: '미백/토닝', name: '신데렐라주사', purpose: '', area: '전신', areaDetail: '전신', unit: '', en: 'Brightening Injection' },
  { major: '피부', sub: '미백/토닝', name: '마늘주사', purpose: '', area: '전신', areaDetail: '전신', unit: '', en: '' },
  { major: '피부', sub: '미백/토닝', name: '글루타치온 주사', purpose: '', area: '전신', areaDetail: '전신', unit: '', en: 'Brightening Injection' },

  // ── 스킨부스터 ──
  { major: '피부', sub: '스킨부스터', name: '리쥬란 힐러', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '리쥬란 HB', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '아이리쥬란', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '눈', unit: 'cc', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '입술리쥬란', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '입술', unit: 'cc', en: '' },
  { major: '피부', sub: '스킨부스터', name: '릴리이드', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: '' },
  { major: '피부', sub: '스킨부스터', name: '리즈네', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: '' },
  { major: '피부', sub: '스킨부스터', name: 'PN 주사', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: '' },
  { major: '피부', sub: '스킨부스터', name: '스킨부스터', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: '' },
  { major: '피부', sub: '스킨부스터', name: '플라센텍스', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '연어주사', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '쥬베룩 스킨', purpose: '모공/흉터', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '쥬베룩 아이', purpose: '', area: '얼굴', areaDetail: '눈', unit: '', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '물광주사', purpose: '수분', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '아기주사', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '샤넬주사', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '스킨바이브', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '리바이브', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: '' },
  { major: '피부', sub: '스킨부스터', name: '리투오', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'ECM Injection' },
  { major: '피부', sub: '스킨부스터', name: '셀르디엠', purpose: '주름/탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'ECM Injection' },
  { major: '피부', sub: '스킨부스터', name: '엑소좀 부스터', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Exosome' },
  { major: '피부', sub: '스킨부스터', name: '줄기세포 주사', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: '' },
  { major: '피부', sub: '스킨부스터', name: '줄기세포 정맥주사', purpose: '', area: '전신', areaDetail: '전신', unit: 'cc', en: '' },

  // ── 여드름/흉터 ──
  { major: '피부', sub: '여드름/흉터', name: '포텐자', purpose: '모공/흉터', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '실펌X', purpose: '모공/흉터', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '시크릿', purpose: '모공/흉터', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '지니어스RF', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '스칼렛', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '프락셀', purpose: '모공/흉터', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: '피코프락셀', purpose: '모공/흉터', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: 'CO2 레이저', purpose: '점제거', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: '서브시전', purpose: '흉터', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: '' },
  { major: '피부', sub: '여드름/흉터', name: '여드름 레이저', purpose: '여드름/피지', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: '여드름 약 처방', purpose: '여드름/피지', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: '' },
  { major: '피부', sub: '여드름/흉터', name: '염증주사', purpose: '여드름', area: '얼굴', areaDetail: '얼굴 전체', unit: '부위', en: '' },
  { major: '피부', sub: '여드름/흉터', name: '골드 PTT', purpose: '여드름/피지', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: '' },

  // ── 일반관리 ──
  { major: '피부', sub: '일반관리', name: '필링', purpose: '여드름/피지', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Chemical Peel' },
  { major: '피부', sub: '일반관리', name: '하이드라페이셜', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Hydrafacial' },
  { major: '피부', sub: '일반관리', name: 'LED 관리', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'LED Therapy' },
  { major: '피부', sub: '일반관리', name: 'LDM', purpose: '진정/보습', area: '얼굴', areaDetail: '얼굴 전체', unit: '분', en: 'LDM' },
  { major: '피부', sub: '일반관리', name: '메디컬 스킨케어', purpose: '', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Medical Skincare' },

  // ══════════════════════════════════════════════════════════════
  // 바디
  // ══════════════════════════════════════════════════════════════
  // ── 지방분해주사 ──
  { major: '바디', sub: '지방분해주사', name: '얼굴 지방분해 주사', purpose: '지방', area: '얼굴', areaDetail: '이중턱', unit: '', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '바디 지방분해 주사', purpose: '지방', area: '바디', areaDetail: '팔뚝/복부', unit: '', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: 'MPL', purpose: '', area: '얼굴/바디', areaDetail: '', unit: '', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '소멸핏', purpose: '', area: '얼굴/바디', areaDetail: '', unit: '', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '컷주사', purpose: '', area: '얼굴/바디', areaDetail: '', unit: '', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '카이벨라', purpose: 'FDA승인', area: '얼굴', areaDetail: '이중턱', unit: '', en: 'Fat Dissolving Injection' },

  // ── 바디필러 ──
  { major: '바디', sub: '바디필러', name: '손등 필러', purpose: '', area: '바디', areaDetail: '손등', unit: '', en: 'Dermal Filler' },

  // ── 바디토닝 ──
  { major: '바디', sub: '바디토닝', name: '튠바디', purpose: '지방/탄력', area: '바디', areaDetail: '바디', unit: '', en: 'Body Contouring' },
  { major: '바디', sub: '바디토닝', name: '바디 인모드', purpose: '지방', area: '바디', areaDetail: '팔/종아리/허벅지/복부/등', unit: '', en: 'Multi-Mode Lifting' },
  { major: '바디', sub: '바디토닝', name: '바디 온다', purpose: '지방/탄력', area: '바디', areaDetail: '팔/종아리/허벅지/복부/등', unit: '', en: 'Microwave Lifting' },
  { major: '바디', sub: '바디토닝', name: 'S라인 레이저', purpose: '', area: '바디', areaDetail: '바디', unit: '', en: 'Body Contouring' },

  // ══════════════════════════════════════════════════════════════
  // 제모
  // ══════════════════════════════════════════════════════════════
  { major: '제모', sub: '부위별 제모', name: '턱 제모', purpose: '제모', area: '얼굴', areaDetail: '턱', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '인중 제모', purpose: '제모', area: '얼굴', areaDetail: '인중', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '구레나룻 제모', purpose: '제모', area: '얼굴', areaDetail: '구레나룻', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '이마 제모', purpose: '제모', area: '얼굴', areaDetail: '이마', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '겨드랑이 제모', purpose: '제모', area: '바디', areaDetail: '겨드랑이', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '팔 제모', purpose: '제모', area: '바디', areaDetail: '팔', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '다리 제모', purpose: '제모', area: '바디', areaDetail: '다리', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '비키니 제모', purpose: '제모', area: '바디', areaDetail: '비키니', unit: '', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '등 제모', purpose: '제모', area: '바디', areaDetail: '등', unit: '', en: 'Laser Hair Removal' },

  // ══════════════════════════════════════════════════════════════
  // 약처방
  // ══════════════════════════════════════════════════════════════
  { major: '약처방', sub: '다이어트 약', name: '마운자로', purpose: '지방', area: '', areaDetail: '', unit: '', en: '' },
  { major: '약처방', sub: '다이어트 약', name: '위고비', purpose: '지방', area: '', areaDetail: '', unit: '', en: '' },
  { major: '약처방', sub: '다이어트 약', name: '다이어트 약처방', purpose: '지방', area: '', areaDetail: '', unit: '', en: '' },
];

/** 시술명 → full item 매핑 */
export const MASTER_LOOKUP = new Map();
for (const item of MASTER_LIST) {
  MASTER_LOOKUP.set(item.name, item);
}

/** 대분류 → tag 매핑 */
export const MAJOR_TO_TAG = {
  '리프팅': 'lifting',
  '필러': 'filler',
  '보톡스': 'botox',
  '피부': 'skin',
  '바디': 'body',
  '제모': 'hair_removal',
  '약처방': 'prescription',
  '제증명': 'certificate',
  '미분류': 'unclassified',
};

/** 중분류 → tag 세분화 */
export const SUB_TO_TAG = {
  '레이저 리프팅': 'laser_lifting',
  '실 리프팅': 'thread_lifting',
  '얼굴 필러': 'face_filler',
  '바디 필러': 'body_filler',
  '얼굴 보톡스': 'face_botox',
  '바디 보톡스': 'body_botox',
  '미백/토닝': 'whitening',
  '스킨부스터': 'skinbooster',
  '여드름/흉터': 'acne_scar',
  '일반관리': 'skincare',
  '지방분해주사': 'fat_dissolving',
  '바디필러': 'body_filler',
  '바디토닝': 'body_toning',
  '부위별 제모': 'hair_removal',
  '다이어트 약': 'diet_rx',
};

/** 모든 시술명 목록 (fuzzy matching용) */
export const ALL_TREATMENT_NAMES = MASTER_LIST.map(t => t.name);

/** 목적 키워드 전체 리스트 (중복 제거) */
export const ALL_PURPOSES = [...new Set(
  MASTER_LIST.flatMap(t => (t.purpose || '').split('/').filter(Boolean))
)];

/**
 * 마스터 리스트 요약 (LLM 프롬프트용)
 * 대분류 > 중분류: 시술명[목적] 형태
 */
export function buildMasterSummary() {
  const grouped = {};
  for (const item of MASTER_LIST) {
    const key = `${item.major} > ${item.sub}`;
    if (!grouped[key]) grouped[key] = [];
    const purposeStr = item.purpose ? `[${item.purpose}]` : '';
    grouped[key].push(`${item.name}${purposeStr}`);
  }
  return Object.entries(grouped)
    .map(([key, names]) => `${key}: ${names.join(', ')}`)
    .join('\n');
}
