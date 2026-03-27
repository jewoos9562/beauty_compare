/**
 * 시술 마스터 리스트 (CSV 기반 자동 생성)
 * brand_aliases: 클리닉에서 사용하는 다양한 이름들
 */

export const MASTER_LIST = [
  // ════════════════════════════════════════════════════════════
  // 필러
  // ════════════════════════════════════════════════════════════
  // ── 얼굴 필러 ──
  { major: '필러', sub: '얼굴 필러', name: '팔자 필러', purpose: '주름/볼륨', area: '얼굴', areaDetail: '팔자', unit: 'cc', en: 'Nasolabial Filler', aliases: ["팔자필러", "팔자주름필러", "레스틸렌", "벨로테로", "쥬비덤", "뉴라미스", "아띠에르"] },
  { major: '필러', sub: '얼굴 필러', name: '입술 필러', purpose: '볼륨', area: '얼굴', areaDetail: '입술', unit: 'cc', en: 'Lip Filler', aliases: ["입술필러", "립필러", "레스틸렌", "벨로테로", "쥬비덤", "뉴라미스", "아띠에르"] },
  { major: '필러', sub: '얼굴 필러', name: '코 필러', purpose: '볼륨', area: '얼굴', areaDetail: '코', unit: 'cc', en: 'Nose Filler', aliases: ["코필러", "코조각주사", "미쥬코"] },
  { major: '필러', sub: '얼굴 필러', name: '귀 필러', purpose: '볼륨', area: '얼굴', areaDetail: '귓볼', unit: 'cc', en: 'Ear Filler', aliases: ["귀필러", "요정귀필러", "귓볼필러"] },
  { major: '필러', sub: '얼굴 필러', name: '턱끝 필러', purpose: '볼륨', area: '얼굴', areaDetail: '턱끝', unit: 'cc', en: 'Chin Filler', aliases: ["턱끝필러", "턱필러", "레스틸렌", "벨로테로", "쥬비덤", "뉴라미스", "아띠에르"] },
  { major: '필러', sub: '얼굴 필러', name: '볼 필러', purpose: '볼륨', area: '얼굴', areaDetail: '볼', unit: 'cc', en: 'Cheek Filler', aliases: ["볼필러", "앞볼필러", "옆볼필러", "앞광대필러", "레스틸렌", "벨로테로", "쥬비덤", "뉴라미스", "아띠에르"] },
  { major: '필러', sub: '얼굴 필러', name: '이마 필러', purpose: '볼륨', area: '얼굴', areaDetail: '이마', unit: 'cc', en: 'Forehead Filler', aliases: ["이마필러", "레스틸렌", "벨로테로", "쥬비덤", "뉴라미스", "아띠에르"] },
  { major: '필러', sub: '얼굴 필러', name: '눈밑 필러', purpose: '볼륨', area: '얼굴', areaDetail: '눈밑', unit: 'cc', en: 'Under Eye Filler', aliases: ["눈밑필러", "눈물고랑필러", "애교살필러", "레스틸렌", "벨로테로", "쥬비덤", "뉴라미스", "아띠에르"] },
  { major: '필러', sub: '얼굴 필러', name: '목주름 필러', purpose: '주름', area: '얼굴', areaDetail: '목', unit: 'cc', en: 'Neck Filler', aliases: ["목주름필러", "목필러", "밴스슬림넥", "슬림넥"] },
  { major: '필러', sub: '얼굴 필러', name: '스컬트라', purpose: '볼륨/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'Sculptra', aliases: ["스컬트라", "sculptra"] },
  { major: '필러', sub: '얼굴 필러', name: '쥬베룩 볼륨', purpose: '볼륨', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Juvelook Volume', aliases: ["쥬베룩볼륨", "쥬베룩 볼륨"] },
  { major: '필러', sub: '얼굴 필러', name: '래디어스', purpose: '볼륨/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'Radiesse', aliases: ["래디어스", "레디어스", "radiesse"] },
  { major: '필러', sub: '얼굴 필러', name: '리투오', purpose: '탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'Retoо', aliases: ["리투오", "retoо"] },
  { major: '필러', sub: '얼굴 필러', name: '셀르디엠', purpose: '탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'vial', en: 'Cellde-M', aliases: ["셀르디엠"] },
  // ── 바디 필러 ──
  { major: '필러', sub: '바디 필러', name: '손등 필러', purpose: '볼륨', area: '바디', areaDetail: '손등', unit: 'cc', en: 'Hand Filler', aliases: ["손등필러"] },
  { major: '필러', sub: '바디 필러', name: '어깨 필러', purpose: '볼륨', area: '바디', areaDetail: '어깨', unit: 'cc', en: 'Shoulder Filler', aliases: ["어깨필러"] },
  { major: '필러', sub: '바디 필러', name: '힙딥/골반 필러', purpose: '볼륨', area: '바디', areaDetail: '엉덩이', unit: 'cc', en: 'Hip Filler', aliases: ["힙딥필러", "골반필러", "힙딥/골반필러"] },
  // ════════════════════════════════════════════════════════════
  // 피부
  // ════════════════════════════════════════════════════════════
  // ── 미백/토닝 ──
  { major: '피부', sub: '미백/토닝', name: '토닝 레이저', purpose: '미백/색소', area: '얼굴', areaDetail: '얼굴 전체', unit: '회', en: 'Toning Laser', aliases: ["토닝레이저", "미인토닝", "레이저토닝"] },
  { major: '피부', sub: '미백/토닝', name: '피코 토닝', purpose: '미백/색소', area: '얼굴', areaDetail: '얼굴 전체', unit: '회', en: 'Pico Toning', aliases: ["피코토닝", "피코슈어", "피코웨이"] },
  { major: '피부', sub: '미백/토닝', name: 'IPL', purpose: '미백/색소', area: '얼굴', areaDetail: '표피성 색소·혈관 · 다파장 광선', unit: '', en: 'IPL', aliases: ["IPL", "포토나BBL", "루메니스M22"] },
  { major: '피부', sub: '미백/토닝', name: '홍조 레이저', purpose: '색소/홍조', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Vascular Laser', aliases: ["홍조레이저", "V빔", "엑셀V", "엑셀V플러스", "클라리티"] },
  { major: '피부', sub: '미백/토닝', name: '백옥주사', purpose: '미백', area: '전신', areaDetail: '전신', unit: '', en: 'Glutathione IV', aliases: ["백옥주사", "글루타치온주사"] },
  { major: '피부', sub: '미백/토닝', name: '신데렐라주사', purpose: '미백', area: '전신', areaDetail: '전신', unit: '', en: 'Cinderella IV', aliases: ["신데렐라주사", "기미주사"] },
  // ── 스킨부스터 ──
  { major: '피부', sub: '스킨부스터', name: '리쥬란 힐러', purpose: '탄력/주름/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Rejuran Healer', aliases: ["리쥬란힐러", "리쥬란", "연어주사", "밴스란힐러", "플라센텍스"] },
  { major: '피부', sub: '스킨부스터', name: '리쥬란 HB', purpose: '탄력/주름/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Rejuran HB', aliases: ["리쥬란HB", "리쥬란프리미엄"] },
  { major: '피부', sub: '스킨부스터', name: '아이리쥬란', purpose: '탄력/주름/수분', area: '얼굴', areaDetail: '눈', unit: 'cc', en: 'Eye Rejuran', aliases: ["아이리쥬란", "리쥬란아이"] },
  { major: '피부', sub: '스킨부스터', name: 'PN 주사', purpose: '탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'PN Injection', aliases: ["리즈네", "PN주사", "연어주사"] },
  { major: '피부', sub: '스킨부스터', name: '물광주사', purpose: '수분', area: '얼굴', areaDetail: '얼굴 전체', unit: '더마샤인·하이쿡스(주입기기)', en: 'Hydro Booster', aliases: ["물광주사", "아기주사", "샤넬주사", "릴리이드", "더마샤인", "하이쿡스"] },
  { major: '피부', sub: '스킨부스터', name: '쥬베룩 스킨', purpose: '수분/모공/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Juvelook Skin', aliases: ["쥬베룩스킨", "쥬베룩", "쥬베룩 스킨"] },
  { major: '피부', sub: '스킨부스터', name: '쥬베룩 아이', purpose: '탄력/수분', area: '얼굴', areaDetail: '눈', unit: 'cc', en: 'Juvelook Eye', aliases: ["쥬베룩아이", "쥬베룩 아이"] },
  { major: '피부', sub: '스킨부스터', name: '엑소좀 부스터', purpose: '탄력/수분', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Exosome Booster', aliases: ["엑소좀", "ASCE엑소좀", "콜라스터넥소좀"] },
  // ── 여드름/흉터 ──
  { major: '피부', sub: '여드름/흉터', name: '포텐자', purpose: '여드름/흉터/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Potenza', aliases: ["포텐자", "potenza", "포텐자마이크로니들"] },
  { major: '피부', sub: '여드름/흉터', name: '실펌X', purpose: '여드름/흉터/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Sylfirm X', aliases: ["실펌X", "실펌x"] },
  { major: '피부', sub: '여드름/흉터', name: '프락셀', purpose: '여드름/흉터/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Fraxel', aliases: ["프락셀", "피코프락셀"] },
  { major: '피부', sub: '여드름/흉터', name: 'AHA 필링', purpose: '여드름/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'AHA Peel', aliases: ["AHA필링", "핑크필", "GA필"] },
  { major: '피부', sub: '여드름/흉터', name: 'BHA 필링', purpose: '여드름/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'BHA Peel', aliases: ["BHA필링", "블랙필", "살리실산필링"] },
  // ── 일반관리 ──
  { major: '피부', sub: '일반관리', name: '하이드라페이셜', purpose: '수분/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Hydrafacial', aliases: ["하이드라페이셜", "아쿠아필링", "아쿠아필"] },
  { major: '피부', sub: '일반관리', name: 'LDM', purpose: '수분/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'LDM', aliases: ["LDM"] },
  // ── 색소/홍조 ──
  { major: '피부', sub: '색소/홍조', name: '클라리티', purpose: '색소/미백/홍조', area: '얼굴', areaDetail: '얼굴 전체', unit: '회', en: 'Clarity Laser', aliases: ["클라리티", "클라리티프로", "클라리티2"] },
  // ── 스킨부스터 ──
  { major: '피부', sub: '스킨부스터', name: '스킨바이브 (가교 HA)', purpose: '수분/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Skinvive', aliases: ["스킨바이브", "skinvive"] },
  { major: '피부', sub: '스킨부스터', name: '리바이브 (가교 HA)', purpose: '수분/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Revive', aliases: ["리바이브", "revive"] },
  { major: '피부', sub: '스킨부스터', name: '레티젠', purpose: '탄력/수분/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Laetigen', aliases: ["레티젠", "laetigen"] },
  { major: '피부', sub: '스킨부스터', name: '콜라스터 오리지널', purpose: '수분/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '4cc', en: '콜라스터 오리지널', aliases: ["콜라스터오리지널", "콜라스터 오리지널"] },
  { major: '피부', sub: '스킨부스터', name: '콜라스터 브라이트닝', purpose: '수분/미백', area: '얼굴', areaDetail: '얼굴 전체', unit: '6cc', en: '콜라스터 브라이트닝', aliases: ["콜라스터브라이트닝", "콜라스터 브라이트닝"] },
  { major: '피부', sub: '스킨부스터', name: '콜라스터 아크네', purpose: '수분/여드름', area: '얼굴', areaDetail: '얼굴 전체', unit: '6cc', en: '콜라스터 아크네', aliases: ["콜라스터아크네", "콜라스터 아크네"] },
  // ════════════════════════════════════════════════════════════
  // 제모
  // ════════════════════════════════════════════════════════════
  // ── 부위별 제모 ──
  { major: '제모', sub: '부위별 제모', name: '겨드랑이 제모', purpose: '제모', area: '바디', areaDetail: '겨드랑이', unit: '회', en: 'Underarm Hair Removal', aliases: ["겨드랑이제모", "겨드랑이 제모"] },
  { major: '제모', sub: '부위별 제모', name: '팔/다리 제모', purpose: '제모', area: '바디', areaDetail: '팔/다리', unit: '회', en: 'Arm & Leg Hair Removal', aliases: ["팔제모", "다리제모", "팔하완제모", "팔상완제모", "종아리제모"] },
  { major: '제모', sub: '부위별 제모', name: '비키니 제모', purpose: '제모', area: '바디', areaDetail: '비키니', unit: '회', en: 'Brazilian Hair Removal', aliases: ["비키니제모", "브라질리언제모", "사타구니제모"] },
  { major: '제모', sub: '부위별 제모', name: '얼굴 제모', purpose: '제모', area: '얼굴', areaDetail: '얼굴 전체', unit: '회', en: 'Face Hair Removal', aliases: ["얼굴제모", "인중제모", "턱제모", "구레나룻제모", "헤어라인제모"] },
  { major: '제모', sub: '부위별 제모', name: '전신 제모', purpose: '제모', area: '전신', areaDetail: '전신', unit: '회', en: 'Full Body Hair Removal', aliases: ["전신제모"] },
  // ════════════════════════════════════════════════════════════
  // 보톡스
  // ════════════════════════════════════════════════════════════
  // ── 얼굴 보톡스 ──
  { major: '보톡스', sub: '얼굴 보톡스', name: '이마 보톡스', purpose: '주름', area: '얼굴', areaDetail: '이마', unit: 'U', en: 'Forehead Botox', aliases: ["이마보톡스", "이마톡스"] },
  { major: '보톡스', sub: '얼굴 보톡스', name: '미간 보톡스', purpose: '주름', area: '얼굴', areaDetail: '미간', unit: 'U', en: 'Glabellar Botox', aliases: ["미간보톡스", "미간톡스"] },
  { major: '보톡스', sub: '얼굴 보톡스', name: '눈가 보톡스', purpose: '주름', area: '얼굴', areaDetail: '눈가', unit: 'U', en: 'Eye Botox', aliases: ["눈가보톡스", "눈꼬리보톡스"] },
  { major: '보톡스', sub: '얼굴 보톡스', name: '사각턱 보톡스', purpose: '근육', area: '얼굴', areaDetail: '사각턱', unit: 'U', en: 'Jaw Botox', aliases: ["사각턱보톡스", "턱보톡스"] },
  { major: '보톡스', sub: '얼굴 보톡스', name: '침샘 보톡스', purpose: '근육/침샘', area: '얼굴', areaDetail: '침샘', unit: 'U', en: 'Salivary Botox', aliases: ["침샘보톡스", "침샘톡스", "노메스턱"] },
  { major: '보톡스', sub: '얼굴 보톡스', name: '스킨 보톡스', purpose: '모공', area: '얼굴', areaDetail: '얼굴 전체', unit: 'cc', en: 'Skin Botox', aliases: ["스킨보톡스", "모공톡신", "모공보톡스", "아쿠아톡신"] },
  // ── 바디 보톡스 ──
  { major: '보톡스', sub: '바디 보톡스', name: '승모근 보톡스', purpose: '근육', area: '바디', areaDetail: '승모근', unit: 'U', en: 'Trapezius Botox', aliases: ["승모근보톡스", "승모근톡스"] },
  { major: '보톡스', sub: '바디 보톡스', name: '종아리 보톡스', purpose: '근육', area: '바디', areaDetail: '종아리', unit: 'U', en: 'Calf Botox', aliases: ["종아리보톡스"] },
  { major: '보톡스', sub: '바디 보톡스', name: '겨드랑이 다한증 보톡스', purpose: '다한증', area: '바디', areaDetail: '겨드랑이', unit: 'U', en: 'Hyperhidrosis Botox', aliases: ["다한증보톡스", "겨드랑이보톡스"] },
  // ════════════════════════════════════════════════════════════
  // 바디
  // ════════════════════════════════════════════════════════════
  // ── 지방분해주사 ──
  { major: '바디', sub: '지방분해주사', name: '이중턱 지방분해', purpose: '지방감소', area: '바디', areaDetail: '이중턱', unit: '', en: 'Double Chin Injection', aliases: ["이중턱주사", "윤곽주사", "MPL", "소멸핏", "컷주사", "벨라콜린", "브이올렛", "카이벨라"] },
  { major: '바디', sub: '지방분해주사', name: '바디 지방분해', purpose: '지방감소', area: '바디', areaDetail: '복부/팔/허벅지', unit: '', en: 'Body Fat Injection', aliases: ["제로팻", "제로팻주사", "지방분해주사"] },
  // ── 바디 리프팅 ──
  { major: '바디', sub: '바디 리프팅', name: '쿨스컬프팅', purpose: '지방감소', area: '바디', areaDetail: '복부/팔/허벅지', unit: '', en: 'CoolSculpting', aliases: ["쿨스컬프팅", "젤틱"] },
  { major: '바디', sub: '바디 리프팅', name: '튠바디', purpose: '지방감소', area: '바디', areaDetail: '바디 전부위', unit: '', en: 'Tunebody', aliases: ["튠바디", "tunebody"] },
  { major: '바디', sub: '바디 리프팅', name: '바디 인모드', purpose: '지방감소/탄력', area: '바디', areaDetail: '바디 전부위', unit: '부위', en: 'Body InMode', aliases: ["바디인모드", "바디 인모드"] },
  { major: '바디', sub: '바디 리프팅', name: '온다 바디', purpose: '지방감소', area: '바디', areaDetail: '바디 전부위', unit: 'kJ', en: 'Onda Body', aliases: ["온다바디", "온다 바디"] },
  // ════════════════════════════════════════════════════════════
  // 리프팅
  // ════════════════════════════════════════════════════════════
  // ── 레이저 리프팅 ──
  { major: '리프팅', sub: '레이저 리프팅', name: '울쎄라', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Ulthera', aliases: ["울쎄라", "울세라"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '울쎄라피 프라임', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Ultherapy Prime', aliases: ["울쎄라프라임", "울쎄라 프리미엄", "울쎄라피프라임"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '슈링크', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Shurink', aliases: ["슈링크", "쉬링크"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '슈링크 유니버스', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Shurink Universe', aliases: ["슈링크유니버스", "슈링크 유니버스 울트라"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '리프테라', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Liftera', aliases: ["리프테라", "리프터라"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '리니어지', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Lineage', aliases: ["리니어지", "리니어지리프팅"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '쿨소닉', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Coolsonic', aliases: ["쿨소닉"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이슈링크', purpose: '리프팅/탄력/주름', area: '얼굴', areaDetail: '눈', unit: '샷', en: 'Eye Shurink', aliases: ["아이슈링크", "눈매슈링크"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '소프웨이브', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Sofwave', aliases: ["소프웨이브"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '세르프', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Cerf', aliases: ["세르프", "세르프리프팅"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '써마지 FLX', purpose: '리프팅/탄력/주름', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Thermage FLX', aliases: ["써마지", "써마지FLX", "써마지flx"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '올리지오', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Oligio', aliases: ["올리지오", "올리지오리프팅"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '튠페이스', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Tunface', aliases: ["튠페이스", "튠페이스리프팅"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '볼뉴머', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Volnewmer', aliases: ["볼뉴머", "K써마지"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '덴서티', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Densiti', aliases: ["덴서티", "덴서티리프팅"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FORMA', purpose: '리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'InMode Forma', aliases: ["인모드FORMA", "인모드forma", "인모드 포르마"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이써마지', purpose: '탄력/주름', area: '얼굴', areaDetail: '눈', unit: '샷', en: 'Eye Thermage', aliases: ["아이써마지", "눈써마지"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '아이볼뉴머', purpose: '탄력/주름', area: '얼굴', areaDetail: '눈', unit: '샷', en: 'Eye Volnewmer', aliases: ["아이볼뉴머"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FX', purpose: '지방감소/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '부위', en: 'InMode FX', aliases: ["인모드FX", "인모드fx", "인모드 fx", "인모드리프팅"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '인모드 FX+FORMA', purpose: '지방감소/리프팅/탄력', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'InMode FX+Forma', aliases: ["인모드FX+FORMA", "울써마지", "인모드fx+forma"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '온다', purpose: '지방감소/리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: 'kJ', en: 'Onda', aliases: ["온다", "온다리프팅"] },
  { major: '리프팅', sub: '레이저 리프팅', name: '티타늄', purpose: '리프팅/탄력/미백', area: '얼굴', areaDetail: '얼굴 전체', unit: '', en: 'Titan', aliases: ["티타늄", "티타늄리프팅", "소프라노티타늄"] },
  // ── 실 리프팅 ──
  { major: '리프팅', sub: '실 리프팅', name: '실 리프팅', purpose: '리프팅', area: '얼굴', areaDetail: '얼굴 전체', unit: '줄', en: 'Thread Lift', aliases: ["실리프팅", "민트실", "노바리프트", "스프링실", "하이코", "바비코", "울트라실"] },
  { major: '리프팅', sub: '실 리프팅', name: '눈밑 잼버', purpose: '볼륨/탄력', area: '얼굴', areaDetail: '눈밑', unit: '줄', en: 'Jamber Eye', aliases: ["잼버눈밑", "잼버 눈밑"] },
  { major: '리프팅', sub: '실 리프팅', name: '팔자 잼버', purpose: '주름', area: '얼굴', areaDetail: '팔자', unit: '줄', en: 'Jamber Nasolabial', aliases: ["잼버팔자", "팔자리프팅"] },
  // ── 레이저 리프팅 ──
  { major: '리프팅', sub: '레이저 리프팅', name: '포텐자 다이아 리프팅', purpose: '리프팅/탄력/모공', area: '얼굴', areaDetail: '얼굴 전체', unit: '샷', en: 'Potenza Diamond RF Lifting', aliases: ["포텐자다이아", "다이아리프팅", "포텐자 다이아", "다이아 리프팅"] },
  // ── 실 리프팅 ──
  { major: '리프팅', sub: '실 리프팅', name: '코 리프팅', purpose: '볼륨/리프팅', area: '얼굴', areaDetail: '코', unit: '줄', en: 'Nose Thread Lift', aliases: ["하이코", "바비코", "미쥬코", "슈퍼하이코", "탑스코", "미스코"] },
];

export const MAJOR_TO_TAG = {
  '필러': 'filler',
  '피부': 'skin',
  '제모': 'hair_removal',
  '보톡스': 'botox',
  '바디': 'body',
  '리프팅': 'lifting',
  '약처방': 'prescription',
  '제증명': 'certificate',
};

export const SUB_TO_TAG = {
  '얼굴 필러': 'filler',
  '바디 필러': 'filler',
  '미백/토닝': 'skin',
  '스킨부스터': 'skin',
  '여드름/흉터': 'skin',
  '일반관리': 'skin',
  '색소/홍조': 'skin',
  '부위별 제모': 'hair_removal',
  '얼굴 보톡스': 'botox',
  '바디 보톡스': 'botox',
  '지방분해주사': 'body',
  '바디 리프팅': 'body',
  '레이저 리프팅': 'lifting',
  '실 리프팅': 'lifting',
};

export function buildMasterSummary() {
  const lines = [];
  let lastMajor = null;
  for (const m of MASTER_LIST) {
    if (m.major !== lastMajor) {
      lines.push(`\n### ${m.major}`);
      lastMajor = m.major;
    }
    const aliases = m.aliases.length > 0 ? ` (별칭: ${m.aliases.join(', ')})` : '';
    lines.push(`- ${m.sub} > ${m.name} [${m.purpose}]${aliases}`);
  }
  return lines.join('\n');
}

/** alias -> master name lookup */
export function buildAliasMap() {
  const map = new Map();
  for (const m of MASTER_LIST) {
    // name itself
    const norm = m.name.replace(/\s+/g, '').toLowerCase();
    map.set(norm, m);
    for (const a of m.aliases) {
      map.set(a.replace(/\s+/g, '').toLowerCase(), m);
    }
  }
  return map;
}
