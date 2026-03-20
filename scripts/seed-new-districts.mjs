import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertClinic(clinic, categories) {
  // Insert clinic
  const { error: clinicErr } = await supabase
    .from('clinics')
    .upsert(clinic, { onConflict: 'id' });
  if (clinicErr) throw new Error(`Clinic ${clinic.id}: ${clinicErr.message}`);
  console.log(`  ✓ 병원: ${clinic.name}`);

  // Delete old categories for this clinic (to avoid duplicates on re-run)
  await supabase.from('categories').delete().eq('clinic_id', clinic.id);

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const { data: catData, error: catErr } = await supabase
      .from('categories')
      .insert({ clinic_id: clinic.id, name: cat.name, tag: cat.tag, sort_order: i + 1 })
      .select('id')
      .single();
    if (catErr) throw new Error(`Category ${cat.name}: ${catErr.message}`);
    console.log(`    ✓ 카테고리: ${cat.name} (${cat.items.length}개 항목)`);

    // Insert treatments in batches
    const treatments = cat.items.map((t, j) => ({
      category_id: catData.id,
      name: t.name,
      orig_price: t.orig ?? null,
      event_price: t.event ?? null,
      base_price: t.base ?? null,
      sort_order: j + 1,
    }));

    const { error: tErr } = await supabase.from('treatments').insert(treatments);
    if (tErr) throw new Error(`Treatments: ${tErr.message}`);
  }
}

async function main() {
  console.log('=== 성동구 & 강남구 데이터 시드 시작 ===\n');

  // 1. Insert districts
  const { error: dErr } = await supabase.from('districts').upsert([
    { id: 'seongdong', name: '성동구', active: true },
    { id: 'gangnam', name: '강남구', active: true },
  ], { onConflict: 'id' });
  if (dErr) throw dErr;
  console.log('✓ 지역구 추가: 성동구, 강남구\n');

  // ======================================================
  // 성동구 clinics
  // ======================================================
  console.log('--- 성동구 ---');

  // 유앤아이 왕십리점
  await insertClinic(
    { id: 'uni_wangsimni', district_id: 'seongdong', name: '유앤아이 왕십리점', address: '서울 성동구 왕십리로 315 한동타워 2,3층', phone: '1661-6020', note: '', color: 'from-emerald-500 to-teal-500' },
    [
      { name: '보톡스/주사', tag: 'botox', items: [
        { name: '보톡스(국산) 1부위', orig: 60000, event: 35000 },
        { name: '보톡스(국산) 스킨보톡스', orig: 370000, event: 190000 },
        { name: '보톡스(영국산) 1부위', orig: 100000, event: 55000 },
        { name: '보톡스(영국산) 스킨보톡스', orig: 400000, event: 220000 },
        { name: '필러 리쥬비엘 1cc', orig: 370000, event: 190000 },
        { name: '필러 벨로테로 1cc', orig: 680000, event: 350000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울써라피프라임 300샷', orig: 1900000, event: 1100000 },
        { name: '울써라피프라임 600샷', orig: 3400000, event: 2000000 },
        { name: '써마지 300샷', orig: 1800000, event: 990000 },
        { name: '써마지 600샷', orig: 3000000, event: 1690000 },
        { name: '올리지오 300샷', orig: 960000, event: 490000 },
        { name: '올리지오 600샷', orig: 1600000, event: 850000 },
        { name: '인모드FX V라인 1회', orig: 290000, event: 150000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 1회', orig: 70000, event: 50000 },
        { name: '아쿠아필 3회', orig: 210000, event: 120000 },
        { name: '소노케어 1회', orig: 50000, event: 40000 },
        { name: '크라이오 1회', orig: 50000, event: 40000 },
        { name: '라라필 1회', orig: 100000, event: 70000 },
      ]},
      { name: '색소/토닝', tag: 'laser', items: [
        { name: '피코토닝 1회', orig: 290000, event: 150000 },
        { name: '피코토닝 5회', orig: 1100000, event: 590000 },
        { name: 'V레이저 1회', orig: 190000, event: 100000 },
        { name: 'V레이저 5회', orig: 980000, event: 500000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 다리+팔 10회', orig: 1470000, event: 1200000 },
        { name: '남성 얼굴+턱 5회', orig: 500000, event: 400000 },
        { name: '남성 얼굴+턱 10회', orig: 800000, event: 690000 },
      ]},
      { name: '체중관리', tag: 'body', items: [
        { name: '트리플바디 1회', orig: 190000, event: 100000 },
        { name: '카복시테라피 1회', orig: 35000, event: 20000 },
        { name: '카복시테라피 15회', orig: 290000, event: 150000 },
      ]},
    ]
  );

  // 밴스의원 성수점
  await insertClinic(
    { id: 'vands_seongsu', district_id: 'seongdong', name: '밴스의원 성수점', address: '서울 성동구 아차산로 107', phone: '02-6956-0046', note: '일요일 진료', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스 1+1', orig: 1800, event: 1000 },
        { name: '제오민 주름 1부위', orig: 55000, event: 29000 },
        { name: '엘러간 주름 1부위', orig: 60000, event: 39000 },
        { name: '국산 사각턱', orig: 8500, event: 4900 },
        { name: '제오민 사각턱', orig: 130000, event: 79000 },
        { name: '모공톡신 1cc', orig: 55000, event: 29000 },
        { name: '제오민 모공톡신 3cc', orig: 190000, event: 99000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '입술필러 무제한', orig: 170000, event: 89000 },
        { name: '턱끝 국산 1cc', orig: 80000, event: 49000 },
        { name: '팔자 국산 1cc', orig: 80000, event: 49000 },
        { name: '애교살', orig: 170000, event: 89000 },
        { name: '코필러 무제한', orig: 190000, event: 99000 },
        { name: '동안필러 국산 1cc', orig: 180000, event: 99000 },
        { name: '동안필러 수입 1cc', orig: 250000, event: 130000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '인모드FX 1부위', orig: 17000, event: 9000 },
        { name: '슈링크유니버스 100샷', orig: 28000, event: 15000 },
        { name: '슈링크유니버스 300샷', orig: 100000, event: 55000 },
        { name: '리니어지 100샷', orig: 85000, event: 49000 },
        { name: '온다리프팅 20kJ', orig: 125000, event: 69000 },
        { name: '온다리프팅 60kJ', orig: 580000, event: 299000 },
        { name: '올리지오 100샷', orig: 180000, event: 99000 },
        { name: '볼뉴머 100샷', orig: 180000, event: 99000 },
        { name: '볼뉴머 300샷', orig: 750000, event: 390000 },
        { name: '다이아리프팅 100샷', orig: 180000, event: 99000 },
        { name: '울쎄라피프라임 300샷', orig: 1700000, event: 890000 },
        { name: '써마지 300샷', orig: 1200000, event: 890000 },
        { name: '서프리프팅 300샷', orig: 1650000, event: 890000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬란힐러 2cc', orig: 250000, event: 135000 },
        { name: '리쥬란프리미엄 3cc', orig: 340000, event: 179000 },
        { name: '콜라스터오리지널 1cc', orig: 49000, event: 29000 },
        { name: '콜라스터브라이트닝 1cc', orig: 60000, event: 39000 },
        { name: '콜라스터여드름 1cc', orig: 80000, event: 49000 },
        { name: '넥소좀 1cc', orig: 120000, event: 69000 },
        { name: '연어재생PDRN 1cc', orig: 120000, event: 69000 },
        { name: '릴리드 2cc', orig: 120000, event: 69000 },
        { name: '릴리드 5cc', orig: 240000, event: 129000 },
        { name: '쥬블룩스킨 1cc', orig: 55000, event: 29000 },
        { name: '쥬블룩스킨+MTS 1cc', orig: 120000, event: 69000 },
      ]},
      { name: '레이저토닝', tag: 'laser', items: [
        { name: '피코토닝', orig: 18000, event: 9900 },
        { name: '잡티주사 1부위', orig: 40000, event: 29000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '남성 윗입술+콧수염', orig: 1900, event: 1000 },
        { name: '남성 겨드랑이', orig: 35000, event: 19000 },
        { name: '남성 턱하단패키지', orig: 125000, event: 69000 },
        { name: '여성 윗입술/겨드랑이', orig: 1700, event: 900 },
        { name: '여성 브라질리언(항문제외)', orig: 85000, event: 49000 },
        { name: '여성 브라질리언(항문포함)', orig: 110000, event: 59000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 2단계', orig: 8000, event: 4500 },
        { name: '비타민관리', orig: 18000, event: 9900 },
        { name: 'LED재생레이저', orig: 18000, event: 9900 },
        { name: '크라이오진정', orig: 18000, event: 9900 },
        { name: '블랙헤드관리', orig: 35000, event: 19000 },
        { name: '신데렐라주사', orig: 35000, event: 19000 },
        { name: '블랙필', orig: 35000, event: 19000 },
        { name: 'LDM전체', orig: 48000, event: 25000 },
        { name: '핑크필', orig: 80000, event: 49000 },
        { name: '라라필', orig: 125000, event: 69000 },
        { name: '기본5회패키지', orig: 230000, event: 119000 },
        { name: '프리미엄5회패키지', orig: 360000, event: 190000 },
      ]},
      { name: '목라인', tag: 'neck', items: [
        { name: '밴스슬림넥', orig: 180000, event: 99000 },
        { name: '엘러간100U+슬림넥', orig: 1000000, event: 599000 },
      ]},
    ]
  );

  // ======================================================
  // 강남구 clinics
  // ======================================================
  console.log('\n--- 강남구 ---');

  // 유앤아이 강남점
  await insertClinic(
    { id: 'uni_gangnam', district_id: 'gangnam', name: '유앤아이 강남점', address: '서울 강남구 강남대로 470 808타워 6층', phone: '1661-6020', note: '', color: 'from-emerald-500 to-teal-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 턱', orig: 25000, event: 19000 },
        { name: '국산 주름(1부위)', orig: 19000, event: 15000 },
        { name: '국산 바디(100U)', orig: 125000, event: 65000 },
        { name: '국산 침샘/측두근', orig: 120000, event: 70000 },
        { name: '국산 다한증겨드랑이(100U)', orig: 99000, event: 65000 },
        { name: '국산프리미엄 턱', orig: 59000, event: 40000 },
        { name: '국산프리미엄 주름(1부위)', orig: 45000, event: 29000 },
        { name: '독일산 턱', orig: 150000, event: 110000 },
        { name: '독일산 주름(1부위)', orig: 65000, event: 55000 },
        { name: '미국산 턱', orig: 200000, event: 170000 },
        { name: '미국산 주름(1부위)', orig: 130000, event: 75000 },
        { name: '영국산 턱', orig: 150000, event: 110000 },
        { name: '영국산 주름(1부위)', orig: 65000, event: 55000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '레스틸렌 아이브라이트 0.5cc', orig: 250000, event: 190000 },
        { name: '레스틸렌 키스 1cc', orig: 300000, event: 270000 },
        { name: '쥬비덤 1cc', orig: 289000, event: 270000 },
        { name: '벨로테로 넥 1cc', orig: 289000, event: 250000 },
        { name: '리쥬벨 1cc', orig: 200000, event: 125000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '온다 60K라인', orig: 890000, event: 490000 },
        { name: '온다 200K라인', orig: 1590000, event: 1090000 },
        { name: '온다 300K라인', orig: 2590000, event: 1490000 },
        { name: '울써라피프라임 100샷', orig: 600000, event: 380000 },
        { name: '울써라피프라임 300샷', orig: 1500000, event: 1050000 },
        { name: '울써라피프라임 600샷', orig: 2600000, event: 1950000 },
        { name: '울써라피프라임 900샷', orig: 3500000, event: 2700000 },
        { name: '써마지 눈(225샷)', orig: 1450000, event: 750000 },
        { name: '써마지 얼굴(300샷)', orig: 1900000, event: 990000 },
        { name: '써마지 얼굴(600샷)', orig: 2900000, event: 1690000 },
        { name: '소프웨이브 100샷', orig: 1700000, event: 900000 },
        { name: '인모드 1부위', orig: 60000, event: 45000 },
        { name: '인모드 전체', orig: 150000, event: 99000 },
      ]},
      { name: '레이저·토닝', tag: 'laser', items: [
        { name: '피코토닝 1회', orig: 100000, event: 79000 },
        { name: '할리우드/SelectIPL 1회', orig: 100000, event: 79000 },
        { name: '클라리티2 편평사마귀무제한', orig: 559000, event: 300000 },
        { name: '더마V/클라리티 1회', orig: 130000, event: 100000 },
        { name: '더마V/클라리티 5회', orig: 650000, event: 350000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '쥬블룩스킨 1cc', orig: 69000, event: 49000 },
        { name: '리쥬란 1cc(i/s)', orig: 180000, event: 120000 },
        { name: '리쥬란HB+ 1cc', orig: 230000, event: 120000 },
        { name: '레티젠 눈(1cc)', orig: 450000, event: 250000 },
        { name: '레티젠 2cc', orig: 690000, event: 450000 },
        { name: '스킨바이브 1cc', orig: 220000, event: 170000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 윗입술/턱(1회)', orig: 15000, event: 10000 },
        { name: '여성 전체얼굴(1회)', orig: 70000, event: 60000 },
        { name: '여성 허벅지(1회)', orig: 60000, event: 38000 },
        { name: '여성 다리전체(1회)', orig: 120000, event: 73000 },
        { name: '남성 윗입술/턱(1회)', orig: 25000, event: 20000 },
        { name: '남성 가슴(1회)', orig: 50000, event: 40000 },
        { name: '남성 전체얼굴+턱(1회)', orig: 99000, event: 55000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '스케일링 1회', orig: 120000, event: 65000 },
        { name: '스케일링 5회', orig: 300000, event: 250000 },
        { name: 'FCR필링 얼굴 1회', orig: 150000, event: 100000 },
        { name: 'FCR필링 얼굴 3회', orig: 300000, event: 250000 },
        { name: '엑소좀테라피', orig: 120000, event: 90000 },
        { name: '크라이오 1회', orig: 39000, event: 20000 },
      ]},
    ]
  );

  // 데이뷰 강남점
  await insertClinic(
    { id: 'dayview_gangnam', district_id: 'gangnam', name: '데이뷰 강남점', address: '서울 강남구 강남대로 494', phone: '02-2138-2225', note: 'VAT 별도', color: 'from-orange-500 to-amber-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 턱라인 스킨보톡스 2cc', orig: 69000, event: 39000 },
        { name: '수입프리미엄 주름보톡스 1+1', orig: 190000, event: 99000 },
        { name: '바디보톡스 100U', orig: 89000, event: 69000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '인모드 5분', orig: 76000, event: 39000 },
        { name: '슈링크유니버스 300샷', orig: 125000, event: 69000 },
        { name: '온다리프팅 30,000J', orig: 430000, event: 220000 },
        { name: '티타늄 한부위', orig: 490000, event: 249000 },
        { name: '아이소프웨이브 50샷', orig: 750000, event: 390000 },
        { name: '바디인모드 FX 10분', orig: 380000, event: 199000 },
      ]},
      { name: '필러/볼륨', tag: 'filler', items: [
        { name: '국산 필러 1cc', orig: 120000, event: 69000 },
        { name: '올리디아120 2cc', orig: 190000, event: 119000 },
        { name: '엘란쎄 1cc', orig: 1200000, event: 590000 },
        { name: '리쥬란HB 1cc', orig: 229000, event: 99000 },
      ]},
      { name: '피부개선', tag: 'laser', items: [
        { name: '듀얼토닝', orig: 135000, event: 69000 },
        { name: '아쿠아필+포텐자RF', orig: 290000, event: 159000 },
      ]},
    ]
  );

  // 톡스앤필 강남본점
  await insertClinic(
    { id: 'toxnfill_gangnam', district_id: 'gangnam', name: '톡스앤필 강남본점', address: '서울 서초구 강남대로 415 대동빌딩 10-11층', phone: '02-537-4842', note: '', color: 'from-violet-500 to-purple-500' },
    [
      { name: '보톡스/톡신', tag: 'botox', items: [
        { name: '광경근보톡스 100U(수입/제오민/엘러간)', orig: 1000000, event: 800000 },
        { name: '광경근보톡스 100U(코어톡스)', orig: 900000, event: 700000 },
        { name: '광경근보톡스 100U(국산)', orig: 800000, event: 600000 },
        { name: '광채톡신(국산)', orig: 240000, event: 129000 },
        { name: '광채톡신(수입)', orig: 400000, event: 219000 },
        { name: '광채톡신(국산)+리쥬란HB 1cc', orig: 500000, event: 269000 },
        { name: '광채톡신(수입)+리쥬란HB 1cc', orig: 660000, event: 359000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '레티젠 2cc 1회', orig: 490000, event: 399000 },
        { name: '레티젠 2cc 3회', orig: 1470000, event: 1190000 },
        { name: '벨로테로 리바이브 1cc', orig: 590000, event: 390000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울써라피프라임 100샷', orig: 460000, event: 390000 },
        { name: '울써라피프라임 300샷+써마지FLX 600샷', orig: 3280000, event: 2690000 },
        { name: '울써라피프라임 400샷+써마지FLX 600샷', orig: 3580000, event: 2990000 },
        { name: '울써라피프라임 600샷+써마지FLX 600샷', orig: 4380000, event: 3590000 },
      ]},
    ]
  );

  // 예쁨주의쁨 강남본점
  await insertClinic(
    { id: 'ppeum_gangnam', district_id: 'gangnam', name: '예쁨주의쁨 강남본점', address: '서울 강남구 강남대로 470 808타워 13-14층', phone: '1666-1177', note: '', color: 'from-pink-500 to-rose-500' },
    [
      { name: '리프팅', tag: 'lifting', items: [
        { name: '슈링크유니버스울트라 100샷+PS주사 3cc', orig: 57000, event: 29000 },
        { name: '볼뉴머 100샷', orig: 190000, event: 129000 },
        { name: '포트라리프팅 20KJ', orig: 490000, event: 349000 },
        { name: '얼굴온다리프팅 10KJ', orig: 190000, event: 110000 },
        { name: '울트라라인 100샷', orig: 350000, event: 249000 },
        { name: '울트라라인 바디 100샷', orig: 590000, event: 490000 },
      ]},
      { name: '레이저/피부', tag: 'laser', items: [
        { name: '리팟레이저 5mm', orig: 450000, event: 290000 },
        { name: '풀페이스 셀르디엠 1회(7cc)', orig: 1160000, event: 650000 },
        { name: '쥬블룩볼륨 1cc 체험', orig: 89000, event: 49000 },
        { name: '고압산소케어(iVeX) 60분 체험', orig: 195000, event: 99000 },
      ]},
    ]
  );

  // 밴스의원 강남점
  await insertClinic(
    { id: 'vands_gangnam', district_id: 'gangnam', name: '밴스의원 강남점', address: '서울 서초구 강남대로 411 DS타워 12-13층', phone: '02-6956-0133', note: '일요일 진료', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스', orig: 1500, event: 900 },
        { name: '제오민 주름 1부위', orig: 55000, event: 29000 },
        { name: '엘러간 주름 1부위', orig: 100000, event: 59000 },
        { name: '국산 사각턱', orig: 18000, event: 9900 },
        { name: '제오민 사각턱', orig: 140000, event: 79000 },
        { name: '엘러간 사각턱', orig: 250000, event: 149000 },
        { name: '모공톡신 1cc', orig: 50000, event: 29000 },
        { name: '제오민 모공톡신 3cc', orig: 190000, event: 99000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '눈밑필러(한쪽)', orig: 80000, event: 49000 },
        { name: '턱끝 국산 1cc', orig: 80000, event: 49000 },
        { name: '팔자 국산 1cc', orig: 80000, event: 49000 },
        { name: '입술필러 무제한', orig: 160000, event: 89000 },
        { name: '보조개필러 무제한', orig: 160000, event: 89000 },
        { name: '동안필러 국산 3cc+', orig: 180000, event: 99000 },
        { name: '동안필러 수입 3cc+', orig: 250000, event: 130000 },
        { name: '릴리드 2cc', orig: 120000, event: 69000 },
        { name: '릴리드 5cc', orig: 240000, event: 129000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '슈링크유니버스울트라 100샷', orig: 17000, event: 9900 },
        { name: '슈링크유니버스울트라 300샷', orig: 160000, event: 89000 },
        { name: '온다리프팅 10KJ', orig: 80000, event: 49000 },
        { name: '울쎄라피 300샷', orig: 1200000, event: 690000 },
        { name: '울쎄라피Px프라임 300샷', orig: 1600000, event: 890000 },
        { name: '실리프팅 울트라 10가닥(한쪽)', orig: 80000, event: 49000 },
        { name: '눈꺼풀리프팅', orig: 800000, event: 490000 },
      ]},
      { name: '레이저토닝', tag: 'laser', items: [
        { name: '피코슈어토닝 체험', orig: null, event: 29000 },
        { name: '피코토닝 1+1', orig: 18000, event: 9900 },
        { name: '잡티주사', orig: 40000, event: 29000 },
        { name: '피코토닝+피코지우개', orig: 180000, event: 99000 },
        { name: '더마V 싱글모드', orig: 160000, event: 89000 },
        { name: '더마V 듀얼모드', orig: 470000, event: 249000 },
        { name: '더마V 트리플모드', orig: 560000, event: 299000 },
        { name: '엑셀V플러스 싱글모드', orig: 140000, event: 75000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '콜라스터오리지널 1cc', orig: 49000, event: 29000 },
        { name: '콜라스터브라이트닝 1cc', orig: 60000, event: 39000 },
        { name: '콜라스터여드름 1cc', orig: 80000, event: 49000 },
        { name: '넥소좀 1cc', orig: 120000, event: 69000 },
        { name: '연어PDRN 1cc', orig: 120000, event: 69000 },
        { name: '리쥬란힐러 2cc', orig: 250000, event: 135000 },
        { name: '쥬블룩스킨 1cc', orig: 80000, event: 49000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '남성 윗입술+콧수염', orig: 3500, event: 2000 },
        { name: '남성 겨드랑이', orig: 9000, event: 4900 },
        { name: '남성 턱하단패키지', orig: 130000, event: 69000 },
        { name: '여성 윗입술', orig: 1800, event: 1000 },
        { name: '여성 겨드랑이', orig: 3500, event: 2000 },
        { name: '여성 팔전체', orig: 35000, event: 19000 },
        { name: '여성 브라질리언(항문포함)', orig: 199000, event: 99000 },
        { name: '여성 다리전체', orig: 240000, event: 129000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 2단계', orig: 8000, event: 4900 },
        { name: '비타민관리', orig: 18000, event: 9900 },
        { name: 'LED재생레이저', orig: 18000, event: 9900 },
        { name: '블랙헤드관리', orig: 35000, event: 19000 },
        { name: '스케일링', orig: 35000, event: 19000 },
        { name: '크라이오진정', orig: 35000, event: 19000 },
        { name: '기본5회패키지', orig: 230000, event: 119000 },
        { name: '프리미엄5회패키지', orig: 370000, event: 190000 },
      ]},
      { name: '바디', tag: 'body', items: [
        { name: '바디인모드 1부위', orig: 180000, event: 99000 },
        { name: '바디리니어지 1부위', orig: 190000, event: 99000 },
        { name: '바디울쎄라피 100샷', orig: 600000, event: 490000 },
        { name: '밴스슬림넥', orig: 180000, event: 99000 },
        { name: '엘러간100U+슬림넥', orig: 1000000, event: 599000 },
      ]},
    ]
  );

  // ======================================================
  // Add cross keywords for new districts
  // ======================================================
  console.log('\n--- 교차비교 키워드 추가 ---');

  const newKeywords = [
    { label: '울쎄라피/울써라피', keywords: ['울쎄라피', '울써라피', 'ultherapy', '울쎄라'] },
    { label: '온다리프팅', keywords: ['온다', 'onda'] },
    { label: '인모드', keywords: ['인모드', 'inmode'] },
    { label: '소프웨이브', keywords: ['소프웨이브', 'sofwave'] },
    { label: '올리지오', keywords: ['올리지오', 'oligio'] },
    { label: '다이아리프팅', keywords: ['다이아리프팅', 'dia'] },
    { label: '볼뉴머', keywords: ['볼뉴머', 'volnewmer'] },
    { label: '서프리프팅', keywords: ['서프리프팅', 'serp'] },
    { label: '리니어지', keywords: ['리니어지', 'lineage'] },
    { label: '엑셀V', keywords: ['엑셀v', '엑셀V', 'excel v'] },
    { label: '더마V', keywords: ['더마v', '더마V', 'dermav'] },
    { label: '레티젠', keywords: ['레티젠', 'retigen'] },
    { label: '스킨바이브', keywords: ['스킨바이브', 'skinvive'] },
    { label: '엘란쎄', keywords: ['엘란쎄', 'ellanse'] },
  ];

  // Upsert keywords (avoid duplicates with existing)
  for (const kw of newKeywords) {
    const { data: existing } = await supabase
      .from('cross_keywords')
      .select('id')
      .eq('label', kw.label)
      .maybeSingle();
    if (!existing) {
      await supabase.from('cross_keywords').insert(kw);
      console.log(`  ✓ 키워드: ${kw.label}`);
    }
  }

  // ======================================================
  // Update 광진구 to active
  // ======================================================
  await supabase.from('districts').update({ active: true }).eq('id', 'gwangjin');

  console.log('\n=== 완료! ===');

  // Count summary
  const { count: clinicCount } = await supabase.from('clinics').select('*', { count: 'exact', head: true });
  const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  const { count: treatCount } = await supabase.from('treatments').select('*', { count: 'exact', head: true });
  console.log(`병원: ${clinicCount}개, 카테고리: ${catCount}개, 시술: ${treatCount}개`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
