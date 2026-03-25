/**
 * 시술 마스터 리스트 (beauty_compare_시술분류.xlsx 기반)
 * 대분류 · 중분류 · 시술명 (KO) · 표준명 (EN)
 */

export const MASTER_LIST = [
  // ── 리프팅 ──
  { major: '리프팅', sub: '레이저 리프팅', name: '울쎄라', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '울쎄라 프라임', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '슈링크', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '슈링크 유니버스', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '리프테라', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '쿨소닉', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이슈링크', en: 'HIFU Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '소프웨이브', en: 'Parallel Beam Ultrasound' },
  { major: '리프팅', sub: '레이저 리프팅', name: '써마지 FLX', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '올리지오', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '튠페이스', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '볼뉴머', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FORMA', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이써마지', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이볼뉴머', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이올리지오', en: 'RF Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FX', en: 'Multi-Mode Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FX+FORMA', en: 'Multi-Mode Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '온다', en: 'Microwave Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '티타늄 리프팅', en: 'Laser Lifting' },
  { major: '리프팅', sub: '레이저 리프팅', name: '덴서티', en: 'RF Lifting' },
  { major: '리프팅', sub: '실 리프팅', name: '실 리프팅', en: 'Thread Lift' },
  { major: '리프팅', sub: '실 리프팅', name: '잼버 (눈밑)', en: 'Thread Lift' },
  { major: '리프팅', sub: '실 리프팅', name: '잼버 (팔자)', en: 'Thread Lift' },

  // ── 필러 ──
  { major: '필러', sub: '얼굴 필러', name: '팔자 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '입술 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '코 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '턱끝 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '볼 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '이마 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '관자 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '마리오네트 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '목주름 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '눈밑 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '애교살 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '눈물고랑 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '얼굴 필러', name: '스컬트라', en: 'Biostimulator' },
  { major: '필러', sub: '얼굴 필러', name: '쥬베룩 볼륨', en: 'Biostimulator' },
  { major: '필러', sub: '얼굴 필러', name: '래디어스', en: 'Biostimulator' },
  { major: '필러', sub: '얼굴 필러', name: '리투오', en: 'ECM Injection' },
  { major: '필러', sub: '얼굴 필러', name: '셀르디엠', en: 'ECM Injection' },
  { major: '필러', sub: '바디 필러', name: '어깨 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '바디 필러', name: '데콜테 필러', en: 'Dermal Filler' },
  { major: '필러', sub: '바디 필러', name: '힙딥/골반 필러', en: 'Dermal Filler' },

  // ── 보톡스 ──
  { major: '보톡스', sub: '얼굴 보톡스', name: '이마 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '미간 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '눈가 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '눈밑 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '눈썹 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '콧등 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '입술 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '입꼬리 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '팔자 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '턱끝 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '사각턱 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '자갈턱 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '다한증 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '얼굴 보톡스', name: '스킨 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '바디 보톡스', name: '승모근 보톡스', en: 'Botox' },
  { major: '보톡스', sub: '바디 보톡스', name: '종아리 보톡스', en: 'Botox' },

  // ── 피부 ──
  { major: '피부', sub: '미백/토닝', name: '토닝 레이저', en: 'Toning Laser' },
  { major: '피부', sub: '미백/토닝', name: '피코 토닝', en: 'Pico Laser' },
  { major: '피부', sub: '미백/토닝', name: 'IPL', en: 'Toning Laser' },
  { major: '피부', sub: '미백/토닝', name: '백옥주사', en: 'Brightening Injection' },
  { major: '피부', sub: '미백/토닝', name: '신데렐라주사', en: 'Brightening Injection' },
  { major: '피부', sub: '미백/토닝', name: '글루타치온 주사', en: 'Brightening Injection' },
  { major: '피부', sub: '스킨부스터', name: '리쥬란 힐러', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '리쥬란 HB', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '아이리쥬란', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '플라센텍스', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '연어주사', en: 'PDRN Injection' },
  { major: '피부', sub: '스킨부스터', name: '쥬베룩', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '쥬베룩 스킨', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '쥬베룩 아이', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '물광주사', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '아기주사', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '샤넬주사', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '스킨바이브', en: 'HA Skin Booster' },
  { major: '피부', sub: '스킨부스터', name: '리투오', en: 'ECM Injection' },
  { major: '피부', sub: '스킨부스터', name: '셀르디엠', en: 'ECM Injection' },
  { major: '피부', sub: '스킨부스터', name: '엑소좀 부스터', en: 'Exosome' },
  { major: '피부', sub: '여드름/흉터', name: '포텐자', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '실펌X', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '지니어스RF', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '스칼렛', en: 'Fractional RF' },
  { major: '피부', sub: '여드름/흉터', name: '프락셀', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: '피코프락셀', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: 'CO2 레이저', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: '여드름 레이저', en: 'Resurfacing Laser' },
  { major: '피부', sub: '여드름/흉터', name: 'AHA 필링', en: 'Chemical Peel' },
  { major: '피부', sub: '여드름/흉터', name: 'BHA 필링', en: 'Chemical Peel' },
  { major: '피부', sub: '여드름/흉터', name: '알라딘 필링', en: 'Chemical Peel' },
  { major: '피부', sub: '일반관리', name: '하이드라페이셜', en: 'Hydrafacial' },
  { major: '피부', sub: '일반관리', name: '아쿠아필링', en: 'Hydrafacial' },
  { major: '피부', sub: '일반관리', name: 'LED 관리', en: 'LED Therapy' },
  { major: '피부', sub: '일반관리', name: 'LDM', en: 'LDM' },
  { major: '피부', sub: '일반관리', name: '메디컬 스킨케어', en: 'Medical Skincare' },

  // ── 바디 ──
  { major: '바디', sub: '지방분해주사', name: '이중턱 지방분해', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '볼살 지방분해', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '팔뚝 지방분해', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '복부 지방분해', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: 'MPL', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '소멸핏', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '컷주사', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '지방분해주사', name: '카이벨라', en: 'Fat Dissolving Injection' },
  { major: '바디', sub: '바디보톡스', name: '승모근 보톡스', en: 'Botox' },
  { major: '바디', sub: '바디보톡스', name: '종아리 보톡스', en: 'Botox' },
  { major: '바디', sub: '바디보톡스', name: '팔뚝 보톡스', en: 'Botox' },
  { major: '바디', sub: '바디필러', name: '손등 필러', en: 'Dermal Filler' },
  { major: '바디', sub: '바디필러', name: '데콜테 필러', en: 'Dermal Filler' },
  { major: '바디', sub: '바디토닝', name: '튠바디', en: 'Body Contouring' },
  { major: '바디', sub: '바디토닝', name: '바디 인모드', en: 'Multi-Mode Lifting' },
  { major: '바디', sub: '바디토닝', name: '바디 온다', en: 'Microwave Lifting' },
  { major: '바디', sub: '바디토닝', name: 'S라인 레이저', en: 'Body Contouring' },

  // ── 제모 ──
  { major: '제모', sub: '부위별 제모', name: '턱 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '윗입술 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '구레나룻 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '이마 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '겨드랑이 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '팔 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '다리 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '비키니 제모', en: 'Laser Hair Removal' },
  { major: '제모', sub: '부위별 제모', name: '등 제모', en: 'Laser Hair Removal' },
];

/** 시술명 → { major, sub, en } 매핑 */
export const MASTER_LOOKUP = new Map();
for (const item of MASTER_LIST) {
  MASTER_LOOKUP.set(item.name, { major: item.major, sub: item.sub, en: item.en });
}

/** 대분류 → tag 매핑 */
export const MAJOR_TO_TAG = {
  '리프팅': 'lifting',
  '필러': 'filler',
  '보톡스': 'botox',
  '피부': 'skincare',
  '바디': 'body',
  '제모': 'hair_removal',
};

/** 중분류 → tag 세분화 */
export const SUB_TO_TAG = {
  '스킨부스터': 'skinbooster',
  '미백/토닝': 'laser',
  '여드름/흉터': 'skincare',
  '일반관리': 'skincare',
};

/** 모든 시술명 목록 (fuzzy matching용) */
export const ALL_TREATMENT_NAMES = MASTER_LIST.map(t => t.name);
