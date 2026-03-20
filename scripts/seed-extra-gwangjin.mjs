import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opvfdywolzgiqaraoyot.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertClinic(clinic, categories) {
  const { error: clinicErr } = await supabase.from('clinics').upsert(clinic, { onConflict: 'id' });
  if (clinicErr) throw new Error(`Clinic ${clinic.id}: ${clinicErr.message}`);
  console.log(`  ✓ 병원: ${clinic.name}`);
  await supabase.from('categories').delete().eq('clinic_id', clinic.id);
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const { data: catData, error: catErr } = await supabase
      .from('categories')
      .insert({ clinic_id: clinic.id, name: cat.name, tag: cat.tag, sort_order: i + 1 })
      .select('id').single();
    if (catErr) throw new Error(`Category ${cat.name}: ${catErr.message}`);
    console.log(`    ✓ ${cat.name} (${cat.items.length}개)`);
    const treatments = cat.items.map((t, j) => ({
      category_id: catData.id, name: t.name,
      orig_price: t.orig ?? null, event_price: t.event ?? null, base_price: t.base ?? null, sort_order: j + 1,
    }));
    const { error: tErr } = await supabase.from('treatments').insert(treatments);
    if (tErr) throw new Error(`Treatments: ${tErr.message}`);
  }
}

async function main() {
  console.log('=== 광진구 추가 지점 시드 ===\n');

  // 유앤아이 건대점 (출처: kduni114.co.kr 공식 홈페이지)
  await insertClinic(
    { id: 'uni_kondae', district_id: 'gwangjin', name: '유앤아이 건대점', address: '서울 광진구 아차산로 219 2층', phone: '02-2039-3459', note: '', color: 'from-emerald-500 to-teal-500' },
    [
      { name: '보톡스 (독일산)', tag: 'botox', items: [
        { name: '주름 1부위', orig: 70000, event: 45000 },
        { name: '주름 2부위', orig: 130000, event: 85000 },
        { name: '주름 3부위', orig: 190000, event: 110000 },
        { name: '턱', orig: 150000, event: 85000 },
        { name: '침샘/측두근', orig: 190000, event: 110000 },
        { name: '스킨 얼굴전체', orig: 290000, event: 150000 },
        { name: '겨드랑이 다한증 100U', orig: 400000, event: 220000 },
      ]},
      { name: '보톡스 (영국산)', tag: 'botox', items: [
        { name: '주름 3부위 (영국산)', orig: 250000, event: 130000 },
        { name: '턱 (영국산)', orig: 210000, event: 110000 },
        { name: '침샘/측두근 (영국산)', orig: 250000, event: 130000 },
        { name: '스킨 얼굴전체 (영국산)', orig: 350000, event: 190000 },
        { name: '겨드랑이 다한증 100U (영국산)', orig: 500000, event: 260000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '국산 (유스필) 1cc', orig: 160000, event: 85000 },
        { name: '아말리안 1cc', orig: 350000, event: 180000 },
        { name: '벨로테로 1cc', orig: 490000, event: 250000 },
        { name: '쥬비덤 1cc', orig: 490000, event: 250000 },
        { name: '레스틸렌 1cc', orig: 520000, event: 270000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피 프라임 100샷', orig: 400000, event: 290000 },
        { name: '울쎄라피 프라임 300샷', orig: 2000000, event: 1050000 },
        { name: '울쎄라피 프라임 600샷', orig: 3800000, event: 1950000 },
        { name: '인모드 FX 얼굴전체', orig: 150000, event: 79000 },
        { name: '인모드 FORMA 얼굴전체', orig: 150000, event: 79000 },
        { name: '인모드 FX+FORMA 1회', orig: 230000, event: 120000 },
        { name: '인모드 FX+FORMA 3회', orig: 640000, event: 330000 },
        { name: '슈링크 유니버스 300샷 1회', orig: 140000, event: 79000 },
        { name: '슈링크 유니버스 300샷 3회', orig: 410000, event: 210000 },
        { name: '브이로 300샷+고주파3000샷 1회', orig: 580000, event: 300000 },
        { name: '브이로 500샷+고주파5000샷 1회', orig: 980000, event: 500000 },
        { name: '텐써마 300샷', orig: 1200000, event: 650000 },
        { name: '텐써마 600샷', orig: 2300000, event: 1190000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '릴리이드 물광주사 2.5cc', orig: 150000, event: 79000 },
        { name: '광채주사 2cc', orig: 120000, event: 65000 },
        { name: '리쥬란 HB+ 2cc 1회', orig: 680000, event: 349000 },
        { name: '리쥬란 힐러 2cc + 스킨톡신', orig: 430000, event: 220000 },
        { name: '리쥬란 힐러 2cc + 광채주사 2cc', orig: 490000, event: 250000 },
        { name: '리쥬란 원데이 올인원', orig: 550000, event: 290000 },
        { name: '쥬베룩 스킨 2cc', orig: 350000, event: 180000 },
        { name: '쥬베룩 스킨 2cc + 아이 2cc', orig: 750000, event: 390000 },
        { name: '쥬베룩 볼륨 1바이알', orig: 1000000, event: 550000 },
        { name: '레티젠 2cc', orig: 880000, event: 450000 },
        { name: '레티젠 아이 1cc 1회', orig: 550000, event: 300000 },
        { name: '레디어스 1시린지', orig: 1500000, event: 790000 },
        { name: '스킨바이브 1cc', orig: 330000, event: 170000 },
        { name: '스킨바이브 2cc', orig: 560000, event: 290000 },
        { name: '울트라콜 100 2cc', orig: 200000, event: 99000 },
      ]},
      { name: '레이저/토닝', tag: 'laser', items: [
        { name: '피코토닝 or 노블린 1회', orig: 68000, event: 35000 },
        { name: '피코토닝 3회', orig: 180000, event: 100000 },
        { name: '피코토닝+비타민관리 1회', orig: 140000, event: 74000 },
        { name: '듀얼토닝 1회', orig: 150000, event: 79000 },
        { name: '듀얼토닝+비타민관리 1회', orig: 180000, event: 94000 },
        { name: '피코프락셀 나비존 1회', orig: 170000, event: 89000 },
        { name: '피코프락셀 얼굴전체+크라이오 1회', orig: 210000, event: 109000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '밀크필 1회', orig: 98000, event: 50000 },
        { name: '이온자임 1회', orig: 70000, event: 50000 },
        { name: '라라필 1회', orig: 80000, event: 60000 },
        { name: '오투덤 산소테라피 1회', orig: 80000, event: 60000 },
        { name: '위코우노+재생케어 1회', orig: 290000, event: 160000 },
        { name: '네오빔+스케일링 1회', orig: 230000, event: 120000 },
      ]},
      { name: '여드름/흉터', tag: null, items: [
        { name: '포텐자펌핑+방탄주사 1회', orig: 400000, event: 220000 },
        { name: '포텐자펌핑+방탄주사 3회', orig: 1000000, event: 590000 },
        { name: 'MTS+방탄주사 1회', orig: 250000, event: 150000 },
      ]},
      { name: '바디/다이어트', tag: 'body', items: [
        { name: '아쎄라 바디 1회', orig: 290000, event: 150000 },
        { name: '아쎄라 바디 3회', orig: 780000, event: 400000 },
        { name: '지방분해주사 (팔뚝/종아리) 1회', orig: 190000, event: 150000 },
        { name: '지방분해주사 (복부/허벅지) 1회', orig: 430000, event: 220000 },
        { name: '바디 보톡스 100U (독일산)', orig: 300000, event: 180000 },
        { name: '바디 보톡스 100U (영국산)', orig: 450000, event: 230000 },
      ]},
      { name: '실리프팅', tag: 'lifting', items: [
        { name: '하이코', orig: 450000, event: 250000 },
        { name: '잼버실 1줄', orig: 150000, event: 79000 },
        { name: '잼버실 10줄', orig: 1400000, event: 750000 },
        { name: '롱잼버실 1줄', orig: 190000, event: 99000 },
        { name: '이중턱 뿌셔주사', orig: 250000, event: 130000 },
      ]},
      { name: '화수목 특별 이벤트', tag: 'weekday', items: [
        { name: '슈링크유니버스 600샷', orig: 250000, event: 140000 },
        { name: '올인원 부스터 (리쥬란+쥬베룩+릴리이드)', orig: 847000, event: 400000 },
        { name: '목주름 지우개 (벨로테로+톡신+연어주사)', orig: 560000, event: 290000 },
      ]},
    ]
  );

  // 블리비 건대점 (출처: m.velyb.kr 공식 홈페이지)
  await insertClinic(
    { id: 'blivi_kondae', district_id: 'gwangjin', name: '블리비 건대점', address: '서울 광진구 아차산로 237 삼진빌딩 2층', phone: '1833-6233', note: '체험가=첫방문 1회', color: 'from-rose-500 to-pink-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스 1부위 (체험가)', orig: 1750, event: 900 },
        { name: '국산 사각턱 (체험가)', orig: 17500, event: 9000 },
        { name: '국산 바디보톡스 100유닛', orig: 57900, event: 29000 },
        { name: '독일 고순도 주름 1부위', orig: 80000, event: 49000 },
        { name: '국산 고순도 사각턱', orig: 80000, event: 45000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '볼륨필러 국산 1cc (체험가)', orig: 135000, event: 69000 },
        { name: 'V라인 턱끝필러 1cc', orig: 130000, event: 79000 },
        { name: '프리미엄 벨로테로 1cc', orig: 520000, event: 290000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피 프라임 100샷 (체험가)', orig: 570000, event: 290000 },
        { name: '울쎄라피 프라임 300샷 (체험가)', orig: 1770000, event: 890000 },
        { name: '프라임 레이즈 90KJ (체험가)', orig: 970000, event: 490000 },
        { name: '프라임 레이즈 45KJ+슈링크100샷', orig: 700000, event: 359000 },
        { name: '슈링크 유니버스 100샷 (체험가)', orig: 35000, event: 19000 },
        { name: '슈링크 유니버스 300샷 (체험가)', orig: 137000, event: 69000 },
        { name: '덴서티 클래식 100샷 (체험가)', orig: 397000, event: 49000 },
        { name: '인모드 FX 1부위 (체험가)', orig: 19700, event: 9900 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬란힐러 2cc (체험가)', orig: 265000, event: 169000 },
        { name: '리쥬란 HB플러스 1cc (타임세일)', orig: 297000, event: 149000 },
        { name: '리제반PN 2cc (체험가)', orig: 260000, event: 149000 },
        { name: '쥬베룩 스킨 1cc (체험가)', orig: 97000, event: 49000 },
        { name: '쥬베룩 볼륨 3cc (타임세일)', orig: 297000, event: 149000 },
        { name: '레디안 1시린지', orig: 1450000, event: 790000 },
      ]},
      { name: '레이저/토닝', tag: 'laser', items: [
        { name: '레이저토닝+진정관리 (체험가)', orig: 17900, event: 9000 },
        { name: '스타워커 포토나토닝 (체험가)', orig: 137900, event: 79000 },
        { name: '제네시스 레이저 (체험가)', orig: 100000, event: 59000 },
        { name: '피코토닝 1개월 자유이용권', orig: 350000, event: 190000 },
        { name: 'CO2 프락셔널 코모공', orig: 33000, event: 17000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 겨드랑이/인중 5회', orig: 35000, event: 19000 },
        { name: '남성 얼굴전체 5회', orig: 497000, event: 249000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필/비타민관리 (체험가)', orig: null, event: 4500 },
        { name: '큐어스템 엑소좀+MTS+크라이오셀 (체험가)', orig: 109000, event: 55000 },
        { name: '종합여드름 패키지 (체험가)', orig: 130000, event: 69000 },
        { name: '원데이 트러블 패키지', orig: 97900, event: 49000 },
      ]},
      { name: '바디', tag: 'body', items: [
        { name: '블리비S 라이트 (지방세포파괴)', orig: 180000, event: 99000 },
        { name: '바디 환생 패키지 (라이트50cc+바디보톡스100U)', orig: 137000, event: 69000 },
        { name: '카복시/지방분해주사 1개월 무제한', orig: 195000, event: 99000 },
        { name: '바디 인모드 1부위', orig: 189000, event: 95000 },
      ]},
    ]
  );

  // 닥터에버스 건대점 (출처: evers25.co.kr 공식 홈페이지 이벤트 배너)
  await insertClinic(
    { id: 'evers_kondae', district_id: 'gwangjin', name: '닥터에버스 건대점', address: '서울 광진구 건대입구', phone: '', note: 'VAT 별도', color: 'from-amber-500 to-yellow-500' },
    [
      { name: '첫방문 이벤트', tag: 'first', items: [
        { name: '국산 주름보톡스 1부위', orig: 5600, event: 2900 },
        { name: '윤곽주사 에그쉐이핑 6cc', orig: 17600, event: 9000 },
        { name: '피코토닝+모델링팩', orig: 17600, event: 9000 },
        { name: 'LDM(12분)+모델링팩', orig: 29200, event: 14900 },
        { name: '라라필(1,2단계)+크라이오+모델링팩', orig: 76400, event: 39000 },
        { name: '텐쎄라 100라인', orig: 96000, event: 49000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '슈링크유니버스 100샷당 (풍선다트)', orig: 56800, event: 29000 },
        { name: '인모드FX 1부위 1회', orig: 52500, event: 45000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필(1,2,3단계)+LDM+모델링팩 1회', orig: 43100, event: 22000 },
        { name: '아쿠아필+미백/보습/진정+LED+모델링팩 1회', orig: 47000, event: 40000 },
        { name: '스킨스크러버+피코토닝 5회+LED+모델링팩', orig: 264000, event: 225000 },
      ]},
      { name: '평일특가', tag: 'weekday', items: [
        { name: '아쿠아필(1,2,3단계)+재생레이저+모델링팩', orig: 13500, event: 6900 },
        { name: '스킨스크러버+레이저토닝+모델링팩', orig: 9800, event: 5000 },
        { name: '슈링크유니버스 300샷당', orig: 135200, event: 69000 },
        { name: '리쥬란아이 1cc당', orig: 194100, event: 99000 },
        { name: '바디지방분해주사 1회', orig: 49000, event: 25000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 겨드랑이/인중 5회', orig: 20400, event: 15000 },
        { name: '여성 겨드랑이/인중 1년무제한', orig: 50400, event: 29000 },
        { name: '남성 인중+입가+앞턱 5회', orig: 222300, event: 119000 },
        { name: '남성 인중+입가+앞턱 1년무제한', orig: 440000, event: 229000 },
      ]},
    ]
  );

  // cross_keywords에 블리비 추가
  const newKeywords = [
    { label: '블리비S 라이트', keywords: ['블리비S', '지방세포파괴'] },
  ];
  for (const kw of newKeywords) {
    await supabase.from('cross_keywords').upsert(kw, { onConflict: 'label' });
  }

  console.log('\n=== 완료! ===');
  const { count: clinicCount } = await supabase.from('clinics').select('*', { count: 'exact', head: true }).eq('district_id', 'gwangjin');
  const { count: treatCount } = await supabase.from('treatments').select('*', { count: 'exact', head: true });
  console.log(`광진구 병원: ${clinicCount}개, 총 시술: ${treatCount}개`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
