export interface TreatmentItem {
  name: string;
  orig: number | null;
  event: number | null;
  base?: number | null;
}

export interface Category {
  name: string;
  tag: string | null;
  items: TreatmentItem[];
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  note: string;
  color: string;
  categories: Category[];
}

export const CLINICS: Clinic[] = [
  {
    id: 'toxnfill', name: '톡스앤필 건대점', address: '서울 광진구 건대입구', phone: '02-6235-1567',
    note: 'VAT 10% 별도 | 카카오톡 채널 추가 + 홈페이지 예약/내원 고객 기준',
    color: 'from-violet-600 to-violet-400',
    categories: [
      { name: '첫방문 행복 EVENT', tag: 'first', items: [
        { name: '턱보톡스 50U (국산) 1회', orig: 19500, event: 9900 }, { name: '주름보톡스 2부위 1회', orig: 19500, event: 9900 },
        { name: '윤곽주사 1부위 1회', orig: 19500, event: 9900 }, { name: '루카스 토닝 1회', orig: 19500, event: 9900 },
        { name: '아쿠아필 1회', orig: 28000, event: 14900 }, { name: '인모드FX (4분) 1회', orig: 97000, event: 49000 },
        { name: '슈링크 유니버스 울트라F 300샷', orig: 97000, event: 49000 }, { name: '리쥬란 힐러 2cc', orig: 250000, event: 139000 },
        { name: '포텐자 펌핑팁+쥬베룩 2cc', orig: 350000, event: 199000 }, { name: '울쎄라피 프라임 100샷', orig: 490000, event: 299000 },
      ]},
      { name: '3월 스킨부스팅 (3/1~3/31)', tag: 'event', items: [
        { name: '아쿠아필+모델링', orig: 50000, event: 29000 }, { name: '이마+미간톡신(국산)', orig: 75000, event: 39000 },
        { name: '이마+미간톡신(코어톡스)', orig: 110000, event: 69000 }, { name: '저통증 스킨톡신(제오민)', orig: 400000, event: 280000 },
        { name: '리쥬하이 4cc+아이리쥬하이 2cc', orig: 600000, event: 399000 }, { name: '스킨바이브 1cc+1cc', orig: 680000, event: 349000 },
        { name: '쥬베룩 1cc', orig: 80000, event: 49500 }, { name: '레티젠 2cc', orig: 550000, event: 289000 },
        { name: '포텐자 펌핑팁+쥬베룩 4cc', orig: 490000, event: 320000 },
      ]},
      { name: '3월 리프팅 (3/1~3/31)', tag: 'event', items: [
        { name: '울쎄라피 프라임 300샷', orig: 1390000, event: 990000 }, { name: '페이스온다 4만줄', orig: 490000, event: 250000 },
        { name: '리프테라2 3,000샷', orig: 129000, event: 89000 }, { name: '슈링크 유니버스 300샷', orig: 200000, event: 129000 },
        { name: '써마지 600샷+LDM트리플', orig: 2600000, event: 1890000 }, { name: '볼뉴머 300샷', orig: 480000, event: 350000 },
      ]},
      { name: '차세대 스킨부스터 (2/15~3/31)', tag: 'new', items: [
        { name: '리투오 라이트 1vial', orig: 600000, event: 350000 }, { name: '리투오 라이트 1+1vial', orig: 1100000, event: 600000 },
        { name: '리투오 1vial', orig: 1150000, event: 660000 }, { name: '쥬브아셀 3% 1시린지', orig: 750000, event: 390000 },
        { name: '쥬브아셀 8% 1시린지', orig: 1150000, event: 590000 }, { name: '고우리 1시린지', orig: 970000, event: 549000 },
      ]},
      { name: '원데이 맞춤 패키지 (3/1~3/31)', tag: 'event', items: [
        { name: '[스킨케어] 아쿠아필+LDM+모델링', orig: 150000, event: 99000 },
        { name: '[V라인] 울쎄라피300+온다3만+톡신', orig: 1900000, event: 1290000 },
        { name: '[V라인] 온다5만줄+윤곽주사2부위', orig: 550000, event: 299000 },
        { name: '[스킨부스팅] 리쥬하이4cc+쥬베룩2cc+LDM', orig: 800000, event: 419000 },
        { name: '[스킨부스팅] 써마지300+스킨톡신+리쥬하이4cc', orig: 2500000, event: 1490000 },
        { name: '[스킨부스팅] 볼뉴머600+스킨톡신(국산)', orig: 1200000, event: 750000 },
        { name: '[프리미엄] 울쎄라피+써마지+리쥬하이+LDM+백옥', orig: 3900000, event: 2890000 },
      ]},
      { name: '화수목 해피아워 (10:30~16:30)', tag: 'weekday', items: [
        { name: '피코슈어 토닝+시트팩', orig: 95000, event: 49000 }, { name: '턱끝 필러 1cc(국산)', orig: 115000, event: 59000 },
        { name: '쥬베룩 스킨부스터 2cc', orig: 120000, event: 99000 }, { name: '스킨바이브 1cc', orig: 310000, event: 159000 },
        { name: '페이스온다 3만줄+슈링크F 300샷', orig: 430000, event: 219000 }, { name: '레티젠 2cc', orig: 580000, event: 299000 },
        { name: '점 제거 ~60개', orig: 500000, event: 309000 }, { name: '리쥬란HB 4cc', orig: 720000, event: 399000 },
        { name: '페이스온다 8만줄', orig: 900000, event: 459000 },
      ]},
      { name: '건대점 BEST', tag: 'best', items: [
        { name: '턱보톡스 50U(국산)', orig: 35000, event: 29000 }, { name: '라라필', orig: 89000, event: 59000 },
        { name: '이마+미간보톡스(독일산)', orig: 160000, event: 99000 }, { name: '엑셀V플러스(제네시스)', orig: 150000, event: 100000 },
        { name: '리프테라2 3000샷', orig: 129000, event: 100000 }, { name: '더모톡신(국산)', orig: 260000, event: 190000 },
        { name: '리쥬란 힐러 2cc', orig: 300000, event: 250000 }, { name: '쥬베룩(스킨) 1vial', orig: 450000, event: 350000 },
        { name: '슈링크 울트라F 300샷', orig: 319000, event: 160000 }, { name: '포텐자800+쥬베룩4cc', orig: 550000, event: 450000 },
        { name: '체험온다 80000J', orig: 990000, event: 499000 }, { name: '울쎄라피 프라임 300샷', orig: 1390000, event: 1090000 },
        { name: '써마지FLX 600샷', orig: 2490000, event: 1980000 }, { name: '울쎄라피+써마지+LDM', orig: 3880000, event: 2800000 },
      ]},
      { name: '레이저 리프팅', tag: 'event', items: [
        { name: '울쎄라피300+써마지600+LDM', orig: 3880000, event: 2800000 }, { name: '써마지FLX 300샷', orig: 1490000, event: 1090000 },
        { name: '써마지FLX 600샷', orig: 2490000, event: 1980000 }, { name: '볼뉴머 600샷', orig: 870000, event: 690000 },
        { name: '볼뉴머 1000샷', orig: 1300000, event: 1000000 }, { name: '아이울쎄라피 100샷', orig: 600000, event: 450000 },
        { name: '슈링크 울트라F 100샷', orig: 119000, event: 60000 }, { name: '슈링크 울트라F 600샷', orig: 519000, event: 260000 },
        { name: '슈링크 울트라F 1000샷', orig: 759000, event: 380000 }, { name: '튠페이스+LDM 1회', orig: 1000000, event: 790000 },
      ]},
      { name: '체험가 이벤트', tag: 'hot', items: [
        { name: '튠바디 20분 체험', orig: 400000, event: 270000 }, { name: '벨라콜린 1vial 체험', orig: 350000, event: 250000 },
        { name: '포텐자 600샷 체험', orig: 290000, event: 200000 }, { name: '튠페이스 60KJ x2회', orig: 1990000, event: 1000000 },
      ]},
      { name: '디자인 인모드', tag: 'event', items: [
        { name: '인모드 FX(8분)', orig: 160000, event: 129000 }, { name: '인모드 FORMA(8K)', orig: 140000, event: 119000 },
        { name: '인모드 FX+FORMA', orig: 280000, event: 230000 }, { name: 'FX+FORMA 3회권', orig: 800000, event: 600000 },
      ]},
      { name: '체형관리', tag: 'body', items: [
        { name: '프라임 바디컷 500cc', orig: 1600000, event: 890000 }, { name: '프라임 바디컷 500ccx3', orig: 4200000, event: 2250000 },
        { name: '빼빼주사 3cc', orig: 69000, event: 49000 }, { name: '바디보톡스 100U', orig: 157000, event: 89000 },
        { name: '발레리나핏 100cc', orig: 250000, event: 190000 },
      ]},
      { name: '남성 이벤트', tag: 'male', items: [
        { name: '브라질리언 제모', orig: 150000, event: 120000 }, { name: '훈남제모 얼굴아래', orig: 110000, event: 90000 },
        { name: '턱보톡스+침샘+윤곽주사', orig: 165000, event: 109000 }, { name: '맨즈 스피드케어', orig: 110000, event: 80000 },
      ]},
      { name: '일반 - 톡신', tag: null, items: [
        { name: '사각턱톡신', orig: null, event: null, base: 29000 }, { name: '주름톡신', orig: null, event: null, base: 19000 },
        { name: '스킨톡신', orig: null, event: null, base: 190000 }, { name: '턱라인리프팅톡신', orig: null, event: null, base: 79000 },
      ]},
      { name: '일반 - 필러', tag: null, items: [
        { name: '볼륨 필러', orig: null, event: null, base: 150000 }, { name: '턱필러', orig: null, event: null, base: 150000 },
        { name: '코 필러', orig: null, event: null, base: 250000 }, { name: '눈밑고랑 필러', orig: null, event: null, base: 350000 },
        { name: '입술 필러', orig: null, event: null, base: 180000 },
      ]},
      { name: '일반 - 스킨부스터', tag: null, items: [
        { name: '리쥬란힐러', orig: null, event: null, base: 250000 }, { name: '리쥬란아이', orig: null, event: null, base: 120000 },
        { name: '쥬베룩', orig: null, event: null, base: 350000 }, { name: '스킨바이브', orig: null, event: null, base: 350000 },
        { name: '물광주사', orig: null, event: null, base: 150000 }, { name: '레티젠', orig: null, event: null, base: 399000 },
      ]},
      { name: '일반 - 영양주사', tag: null, items: [
        { name: '백옥주사', orig: null, event: null, base: 55000 }, { name: '신데렐라주사', orig: null, event: null, base: 40000 },
        { name: '마늘주사', orig: null, event: null, base: 50000 },
      ]},
    ]
  },
  {
    id: 'uni', name: '유앤아이 건대점', address: '서울 광진구 아차산로 219, 2층', phone: '02-2039-3459',
    note: '이벤트기간 2026.03.01~03.31 | VAT 별도',
    color: 'from-emerald-600 to-emerald-400',
    categories: [
      { name: '입고 이벤트', tag: 'new', items: [
        { name: '포텐자펌핑+방탄주사(플라비셀) 1회', orig: 400000, event: 220000 },
        { name: '포텐자펌핑+방탄주사 3회', orig: 1000000, event: 590000 },
        { name: '레티젠 아이 1cc', orig: 550000, event: 300000 }, { name: '레티젠 아이 1cc 3회', orig: 1650000, event: 850000 },
        { name: '브이올렛(지방세포파괴) 1바이알', orig: 350000, event: 200000 },
        { name: '쥬베룩 볼륨 1바이알', orig: 1000000, event: 550000 }, { name: '쥬베룩 볼륨 3바이알', orig: 2800000, event: 1500000 },
      ]},
      { name: '이달의 단독이벤트', tag: 'event', items: [
        { name: '울쎄라피 프라임 100샷', orig: 400000, event: 290000 },
        { name: '화이트닝 올인원 5회', orig: 1075000, event: 690000 }, { name: '화이트닝 올인원 10회', orig: 2150000, event: 1190000 },
        { name: '홍조 삭제패키지 5회', orig: 1400000, event: 490000 }, { name: '홍조 삭제패키지 10회', orig: 2800000, event: 890000 },
        { name: '울트라콜 100 2cc', orig: 200000, event: 99000 }, { name: '하이코', orig: 290000, event: 250000 },
      ]},
      { name: '첫방문 체험가', tag: 'first', items: [
        { name: '인모드 FX 얼굴전체 체험', orig: 120000, event: 65000 }, { name: '아이슈링크 100샷 체험', orig: 90000, event: 59000 },
        { name: '바디 인모드 1부위 체험', orig: 90000, event: 50000 },
        { name: '승모근/종아리 톡신 100U 체험', orig: 64000, event: 33000 },
        { name: '피코토닝/노블린 1회 체험', orig: 68000, event: 35000 },
        { name: '듀얼토닝+비타민관리 체험', orig: 154000, event: 79000 },
        { name: '릴리이드 물광주사 2.5cc 체험', orig: 180000, event: 65000 },
        { name: '피코프락셀 나비존 체험', orig: 110000, event: 58000 },
      ]},
      { name: '화수목 이벤트', tag: 'weekday', items: [
        { name: '피코토닝 3회', orig: 180000, event: 100000 }, { name: '슈링크유니버스 600샷', orig: 250000, event: 140000 },
        { name: '올인원부스터(리쥬란2cc+쥬베룩2cc+릴리이드2.5cc)', orig: 847000, event: 400000 },
        { name: '목주름지우개(벨로테로+스킨톡신+연어주사)', orig: 560000, event: 290000 },
      ]},
      { name: '레이저리프팅', tag: null, items: [
        { name: '울쎄라피 프라임 300샷', orig: 2000000, event: 1050000 }, { name: '울쎄라피 프라임 600샷', orig: 3800000, event: 1950000 },
        { name: '인모드 FX 얼굴전체', orig: 150000, event: 79000 }, { name: '인모드 FORMA 얼굴전체', orig: 150000, event: 79000 },
        { name: '인모드 FX+FORMA 1회', orig: 230000, event: 120000 }, { name: '인모드 FX+FORMA 3회', orig: 640000, event: 330000 },
        { name: '슈링크 유니버스 300샷', orig: 140000, event: 79000 }, { name: '슈링크 유니버스 300샷 3회', orig: 410000, event: 210000 },
        { name: '텐써마 300샷', orig: 1200000, event: 650000 }, { name: '텐써마 600샷', orig: 2300000, event: 1190000 },
      ]},
      { name: '실리프팅', tag: null, items: [
        { name: '잼버실 1줄', orig: 150000, event: 79000 }, { name: '잼버실 10줄', orig: 1400000, event: 750000 },
        { name: '하이코', orig: 450000, event: 250000 }, { name: '콘셀티나 8줄', orig: 2100000, event: 1100000 },
      ]},
      { name: '보톡스/윤곽', tag: null, items: [
        { name: '주름톡신 1부위(독일산)', orig: 70000, event: 45000 }, { name: '주름톡신 2부위(독일산)', orig: 130000, event: 85000 },
        { name: '턱 톡신(독일산)', orig: 150000, event: 85000 }, { name: '스킨톡신 얼굴전체(독일산)', orig: 290000, event: 150000 },
        { name: '겨드랑이 다한증 100U(독일산)', orig: 400000, event: 220000 },
        { name: '이중턱 뿌셔주사', orig: 250000, event: 130000 },
      ]},
      { name: '필러', tag: null, items: [
        { name: '국산 필러 1cc(유스필)', orig: 160000, event: 85000 }, { name: '아말리안 필러 1cc', orig: 350000, event: 180000 },
        { name: '벨로테로 필러 1cc', orig: 490000, event: 250000 }, { name: '쥬비덤 필러 1cc', orig: 490000, event: 250000 },
        { name: '레스틸렌 필러 1cc', orig: 520000, event: 270000 },
      ]},
      { name: '기미/잡티/홍조', tag: null, items: [
        { name: '듀얼토닝(레이저+제네시스) 1회', orig: 150000, event: 79000 },
        { name: '듀얼토닝 10회', orig: 1100000, event: 600000 },
        { name: '피코토닝/노블린 10회', orig: 1000000, event: 550000 },
      ]},
      { name: '스킨부스터', tag: null, items: [
        { name: '리쥬란 HB PLUS 2cc', orig: 680000, event: 349000 }, { name: '리쥬란 힐러2cc+스킨톡신', orig: 430000, event: 220000 },
        { name: '리쥬란 힐러2cc+쥬베룩2cc', orig: 760000, event: 390000 },
        { name: '리쥬란 원데이(힐러2cc+아이1cc)', orig: 550000, event: 290000 },
        { name: '쥬베룩 스킨 2cc', orig: 350000, event: 180000 },
        { name: '콜라겐주사(레티젠) 2cc', orig: 880000, event: 450000 }, { name: '콜라겐주사(레티젠) 6cc', orig: 2300000, event: 1190000 },
        { name: '레디어스 1시린지', orig: 1500000, event: 790000 },
        { name: '스킨바이브 1cc', orig: 330000, event: 170000 }, { name: '스킨바이브 2cc', orig: 560000, event: 290000 },
        { name: '물광주사(릴리이드) 2.5cc', orig: 150000, event: 79000 }, { name: '광채주사 2cc', orig: 120000, event: 65000 },
      ]},
      { name: '여드름/모공', tag: null, items: [
        { name: '피코프락셀 나비존', orig: 170000, event: 89000 },
        { name: '피코프락셀 전체+크라이오 5회', orig: 960000, event: 490000 },
      ]},
      { name: '스킨케어', tag: null, items: [
        { name: '밀크필 1회', orig: 98000, event: 50000 }, { name: '라라필 1회', orig: 80000, event: 60000 },
        { name: '이온자임 1회', orig: 70000, event: 50000 },
      ]},
      { name: '다이어트', tag: 'body', items: [
        { name: 'HPL 4회+노블쉐이프 4회', orig: 640000, event: 330000 },
        { name: '아쎄라 바디 1회', orig: 290000, event: 150000 },
        { name: '지방분해(복부/허벅지) 1회', orig: 430000, event: 220000 },
        { name: '바디톡신 100U(독일산)', orig: 300000, event: 180000 },
      ]},
    ]
  },
  {
    id: 'dayview', name: '데이뷰 건대입구역점', address: '서울 광진구 동일로20길 106, 1·2층', phone: '02-465-7791',
    note: 'VAT 별도 | 카톡플친 적용가 | 1인 2가지 시술 가능(첫방문)',
    color: 'from-orange-500 to-orange-300',
    categories: [
      { name: '첫방문 이벤트 (상시)', tag: 'first', items: [
        { name: '턱보톡스 50U', orig: 17000, event: 9900 }, { name: '주름보톡스 1부위(국산)', orig: 1900, event: 1000 },
        { name: '얼굴전체 스킨보톡스', orig: 95000, event: 49000 },
        { name: '지방용해주사 2cc', orig: 1900, event: 1000 }, { name: '점제거 1mm(최대3)', orig: 900, event: 500 },
        { name: '인모드 1부위', orig: 55000, event: 29000 }, { name: '슈링크 300샷', orig: 110000, event: 69000 },
        { name: '볼뉴머 고주파리프팅', orig: 590000, event: 299000 },
        { name: '포토나 토닝', orig: 55000, event: 29000 }, { name: '피코토닝', orig: 66000, event: 39000 },
        { name: '카프리 레이저', orig: 77000, event: 39000 }, { name: '듀얼토닝(기미+탄력)', orig: 80000, event: 49000 },
        { name: '모공청소 아쿠아필', orig: 15000, event: 9900 }, { name: '라라필', orig: 17000, event: 9000 },
        { name: '물광 케어', orig: 95000, event: 49000 }, { name: '리쥬란 아이 1cc', orig: 190000, event: 99000 },
        { name: '리쥬란 2cc', orig: 370000, event: 190000 },
        { name: '여성 젠틀맥스 제모', orig: 9900, event: 5000 }, { name: '남성 젠틀맥스 제모', orig: 9900, event: 5000 },
      ]},
      { name: '쁘띠시술 (상시)', tag: 'event', items: [
        { name: '턱 톡신 50U', orig: 9900, event: 5000 }, { name: '스킨톡신 1부위', orig: 29000, event: 15000 },
        { name: '얼굴 지방파괴주사 5cc', orig: 29000, event: 15000 }, { name: '바디톡신 100U', orig: 25000, event: 15000 },
        { name: '입술/턱끝 필러 1cc', orig: 109000, event: 69000 },
      ]},
      { name: '프리미엄 리프팅 (상시)', tag: 'event', items: [
        { name: '엠페이스 1회', orig: 1925000, event: 1275000 }, { name: '엠페이스 3회', orig: 5505000, event: 3375000 },
        { name: '써마지FLX 눈가225샷', orig: 1390000, event: 1000000 }, { name: '써마지FLX 300샷', orig: 1690000, event: 1090000 },
        { name: '써마지FLX 600샷', orig: 2490000, event: 1990000 },
        { name: '온다 브이라인', orig: 550000, event: 450000 }, { name: '온다 이중턱', orig: 650000, event: 550000 },
        { name: '온다 얼굴전체', orig: 790000, event: 690000 }, { name: '온다 60KJ 6회 정기권', orig: 4500000, event: 2320000 },
        { name: '울쎄라피 프라임 아이 100샷', orig: 650000, event: 550000 }, { name: '울쎄라피 프라임 100샷', orig: 650000, event: 550000 },
        { name: '울쎄라피 프라임 300샷', orig: 1800000, event: 1350000 }, { name: '울쎄라피 프라임 600샷', orig: 3300000, event: 2400000 },
        { name: '볼뉴머 아이 100샷', orig: 200000, event: 150000 }, { name: '볼뉴머 300샷', orig: 550000, event: 430000 },
        { name: '볼뉴머 600샷', orig: 1100000, event: 690000 },
        { name: '인모드 FX 5분(부분)', orig: 160000, event: 110000 }, { name: '인모드 FX 10분(전체)', orig: 320000, event: 189000 },
        { name: '인모드 FX 10분 3회', orig: 960000, event: 490000 },
        { name: '인모드 FX+Forma 하프 1회', orig: 299000, event: 158000 }, { name: '인모드 FX+Forma 풀 1회', orig: 490000, event: 310000 },
        { name: '슈링크 울트라 100샷', orig: 109000, event: 69000 }, { name: '슈링크 울트라 300샷', orig: 327000, event: 169000 },
        { name: '슈링크 울트라 300샷 3회', orig: 880000, event: 450000 },
        { name: '슈링크 부스터 300샷', orig: 345000, event: 210000 },
      ]},
      { name: '스킨부스터 (상시)', tag: 'event', items: [
        { name: '리쥬란힐러 2cc', orig: 250000, event: 159000 }, { name: '리쥬란HB 1cc', orig: 229000, event: 119000 },
        { name: '프리미엄 콜라겐주사 2cc', orig: 115000, event: 59000 }, { name: '수분폭탄 릴리이드M 2.5cc', orig: 59000, event: 39000 },
        { name: '유산균 엑소좀 디하이브 2cc', orig: 79000, event: 49000 }, { name: '피부개선 웰스톡스 3cc', orig: 159000, event: 119000 },
        { name: '세포 엑소좀 도노셀 2cc', orig: 59000, event: 39000 },
      ]},
      { name: '색소/홍조 (상시)', tag: 'event', items: [
        { name: '헬리오스3토닝+시트팩 1회', orig: 59000, event: 49000 },
        { name: '헬리오스3토닝+모델링 10회', orig: 590000, event: 396900 },
        { name: '피코슈어토닝+시트팩 1회', orig: 100000, event: 79000 },
        { name: '피코슈어토닝+모델링 5회', orig: 500000, event: 375000 },
        { name: '제네시스토닝+모델링 10회', orig: 1000000, event: 639900 },
        { name: '피코슈어 줌패스 3회', orig: 420000, event: 250000 },
        { name: '점제거(소) 1개', orig: 15000, event: 10000 }, { name: '점제거 얼굴전체 60개', orig: 700000, event: 450000 },
      ]},
      { name: '트러블 (상시)', tag: 'event', items: [
        { name: '피지선박멸 트러블관리 1회', orig: 179000, event: 125300 },
        { name: '피지선박멸 트러블관리 5회', orig: 895000, event: 550000 },
        { name: '에토좀 PTT+재생LED+토닝 1회', orig: 190000, event: 133000 },
        { name: '프리미엄 압출 1회', orig: 70000, event: 50000 }, { name: '염증주사 1개', orig: null, event: 10000 },
        { name: '여드름 약처방 2주', orig: null, event: 10000 },
      ]},
      { name: '스킨케어 (상시)', tag: 'event', items: [
        { name: '모공청소 아쿠아필', orig: 15000, event: 9900 }, { name: '스피드 라라필', orig: 19000, event: 9900 },
        { name: '각질순삭 GA필', orig: 16000, event: 9900 }, { name: '우유광채 밀크필', orig: 18000, event: 9900 },
        { name: '속건조개선 LDM', orig: 20000, event: 12900 },
      ]},
      { name: '제모 - 젠틀맥스프로플러스', tag: null, items: [
        { name: '남성 얼굴아래 1회', orig: 150000, event: 130000 }, { name: '남성 인중+턱끝 5회', orig: 493500, event: 430000 },
        { name: '여성 인중 1회', orig: 40000, event: 24000 }, { name: '여성 겨드랑이 1회', orig: 40000, event: 23000 },
        { name: '여성 브라질리언 5회', orig: 546000, event: 385000 },
      ]},
      { name: '문신제거', tag: null, items: [
        { name: '눈썹문신 1회', orig: 200000, event: 170000 }, { name: '눈썹문신 5회', orig: 1000000, event: 850000 },
        { name: '명함크기 1회', orig: 300000, event: 255000 }, { name: '명함크기 5회', orig: 1500000, event: 1275000 },
      ]},
      { name: '다이어트', tag: 'body', items: [
        { name: '바디 지방파괴주사 50cc', orig: 69000, event: 60000 }, { name: '바디 지방파괴주사 100cc', orig: 130000, event: 110000 },
        { name: '다이어트 약처방 2주', orig: null, event: 10000 },
      ]},
      { name: '영양주사', tag: null, items: [
        { name: '영양수액(백옥/항산화/마늘 택1)', orig: null, event: null, base: 30000 },
        { name: '영양수액 10회', orig: null, event: null, base: 290000 },
        { name: '태반주사 1회', orig: null, event: null, base: 40000 },
      ]},
    ]
  },
];

export const TAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  event:        { label: '이벤트',     color: 'text-orange-700',  bg: 'bg-orange-100' },
  first:        { label: '첫방문',     color: 'text-green-700',   bg: 'bg-green-100' },
  hot:          { label: '핫딜',       color: 'text-red-700',     bg: 'bg-red-100' },
  weekday:      { label: '화수목',     color: 'text-blue-700',    bg: 'bg-blue-100' },
  best:         { label: 'BEST',       color: 'text-purple-700',  bg: 'bg-purple-100' },
  'new':        { label: 'NEW',        color: 'text-teal-700',    bg: 'bg-teal-100' },
  body:         { label: '바디',       color: 'text-amber-700',   bg: 'bg-amber-100' },
  male:         { label: '남성',       color: 'text-indigo-700',  bg: 'bg-indigo-100' },
  botox:        { label: '보톡스',     color: 'text-violet-700',  bg: 'bg-violet-100' },
  filler:       { label: '필러',       color: 'text-pink-700',    bg: 'bg-pink-100' },
  lifting:      { label: '리프팅',     color: 'text-blue-700',    bg: 'bg-blue-100' },
  skinbooster:  { label: '스킨부스터', color: 'text-cyan-700',    bg: 'bg-cyan-100' },
  laser:        { label: '레이저',     color: 'text-rose-700',    bg: 'bg-rose-100' },
  hair_removal: { label: '제모',       color: 'text-lime-700',    bg: 'bg-lime-100' },
  skincare:     { label: '스킨케어',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  neck:         { label: '목라인',     color: 'text-slate-700',   bg: 'bg-slate-100' },
};

export const CROSS_KEYWORDS = [
  { label: '울쎄라피 프라임 300샷', keywords: ['울쎄라피 프라임 300샷', '울쎄라피 300'] },
  { label: '울쎄라피 프라임 100샷', keywords: ['울쎄라피 프라임 100샷', '울쎄라피 100'] },
  { label: '써마지FLX 600샷', keywords: ['써마지flx 600', '써마지 600', '써마지fx 600'] },
  { label: '슈링크 300샷', keywords: ['슈링크 300', '슈링크 유니버스 300', '울트라f 300', '울트라 300'] },
  { label: '볼뉴머 300샷', keywords: ['볼뉴머 300'] },
  { label: '볼뉴머 600샷', keywords: ['볼뉴머 600'] },
  { label: '인모드 FX+FORMA', keywords: ['인모드 fx+forma', 'fx+forma 풀', 'fx + forma'] },
  { label: '인모드 FX', keywords: ['인모드 fx', '인모드fx'] },
  { label: '리쥬란 힐러 2cc', keywords: ['리쥬란 힐러 2cc', '리쥬란힐러 2cc', '리쥬란 2cc'] },
  { label: '쥬베룩 스킨 2cc', keywords: ['쥬베룩 스킨 2cc', '쥬베룩 스킨부스터 2cc'] },
  { label: '스킨바이브 1cc', keywords: ['스킨바이브 1cc'] },
  { label: '레티젠 2cc', keywords: ['레티젠 2cc', '콜라겐주사(레티젠) 2cc'] },
  { label: '온다 리프팅', keywords: ['온다 얼굴', '페이스온다', '온다 리프팅'] },
  { label: '턱보톡스 50U', keywords: ['턱보톡스 50', '턱 톡신 50', '턱톡신'] },
  { label: '스킨톡신 얼굴전체', keywords: ['스킨톡신 얼굴', '스킨보톡스 얼굴', '더모톡신', '스킨톡신'] },
  { label: '물광주사', keywords: ['물광주사', '릴리이드', '물광 케어', '수분폭탄'] },
  { label: '피코토닝', keywords: ['피코토닝', '피코슈어 토닝', '피코슈어토닝'] },
  { label: '아쿠아필', keywords: ['아쿠아필'] },
  { label: '라라필', keywords: ['라라필'] },
  { label: '포텐자', keywords: ['포텐자'] },
  { label: '점 제거', keywords: ['점 제거', '점제거'] },
];
