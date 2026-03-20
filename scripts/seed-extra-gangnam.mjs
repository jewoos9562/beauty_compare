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
  console.log('=== 강남구 추가 지점 시드 ===\n');

  // 톡스앤필 압구정점
  await insertClinic(
    { id: 'toxnfill_apgujeong', district_id: 'gangnam', name: '톡스앤필 압구정점', address: '서울 강남구 논현로168길 18 동신빌딩 5층', phone: '02-542-4842', note: 'VAT 별도', color: 'from-violet-500 to-purple-500' },
    [
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피프라임 300샷', orig: 1500000, event: 1190000 },
        { name: '4세대 써마지FLX 600샷', orig: 2700000, event: 1890000 },
        { name: '울써마지(울쎄라300+써마지600)', orig: 4200000, event: 2790000 },
        { name: '온다 6만줄', orig: 900000, event: 480000 },
        { name: '버츄RF', orig: 1200000, event: 860000 },
      ]},
      { name: '보톡스/톡신', tag: 'botox', items: [
        { name: '얼굴전체+턱보톡스 100U(제오민)', orig: 700000, event: 490000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬하이 4cc', orig: 600000, event: 350000 },
        { name: '스킨바이브 2cc', orig: 590000, event: 350000 },
        { name: '아이리쥬란 10cc', orig: 2000000, event: 1200000 },
        { name: '올인원플러스 5주 프로그램', orig: 400000, event: 270000 },
        { name: '맞춤형 스킨부스터', orig: 190000, event: 120000 },
      ]},
    ]
  );

  // 톡스앤필 신논현점
  await insertClinic(
    { id: 'toxnfill_sinnonhyeon', district_id: 'gangnam', name: '톡스앤필 신논현점', address: '서울 강남구 강남대로 484 2층', phone: '02-537-4842', note: '', color: 'from-violet-500 to-purple-500' },
    [
      { name: '리프팅', tag: 'lifting', items: [
        { name: '슈링크유니버스 600샷', orig: 240000, event: 129000 },
        { name: '티타늄 전체얼굴', orig: 1000000, event: 529000 },
        { name: '온다 무제한', orig: 3900000, event: 1990000 },
        { name: '온다30000J+슈링크300샷', orig: 350000, event: 199000 },
        { name: '써마지FLX300+아이써마지225', orig: 3500000, event: 1890000 },
        { name: '울써라피프라임 300샷', orig: 1850000, event: 990000 },
        { name: '티타늄 한부위', orig: 380000, event: 199000 },
      ]},
      { name: '필러/스킨부스터', tag: 'filler', items: [
        { name: '스컬트라 1바이알', orig: 1050000, event: 549000 },
        { name: '쥬비덤스킨/볼륨 1바이알', orig: 950000, event: 490000 },
        { name: '쥬블룩아이 2cc', orig: 330000, event: 170000 },
        { name: '리쥬란HB 1cc', orig: 390000, event: 199000 },
        { name: '리쥬란 2cc', orig: 290000, event: 149000 },
        { name: '아이리쥬란 1cc', orig: 180000, event: 109000 },
      ]},
      { name: '레이저/스킨케어', tag: 'laser', items: [
        { name: '포텐자 전체얼굴 500샷', orig: 200000, event: 119000 },
        { name: '아쿠아필 1회', orig: 57000, event: 29000 },
      ]},
    ]
  );

  // 유앤아이 선릉점
  await insertClinic(
    { id: 'uni_seolleung', district_id: 'gangnam', name: '유앤아이 선릉점', address: '서울 강남구 테헤란로 421 암천빌딩 2층', phone: '02-552-6020', note: '', color: 'from-emerald-500 to-teal-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름 1부위', orig: 15000, event: 9000 },
        { name: '국산 턱', orig: 45000, event: 25000 },
        { name: '국산 더모톡신', orig: 150000, event: 89000 },
        { name: '국산 종아리/승모근 100U', orig: 150000, event: 99000 },
        { name: '국산프리미엄 주름 1부위', orig: 30000, event: 17000 },
        { name: '국산프리미엄 턱', orig: 95000, event: 50000 },
        { name: '국산프리미엄 더모톡신', orig: 200000, event: 139000 },
        { name: '독일산 턱', orig: 170000, event: 90000 },
        { name: '독일산 순백주사', orig: 360000, event: 189000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '국산 필러 1cc', orig: 130000, event: 99000 },
        { name: '외국산 필러 1cc', orig: 450000, event: 350000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피프라임 아이 100샷', orig: 750000, event: 400000 },
        { name: '울쎄라피프라임 100샷', orig: 600000, event: 380000 },
        { name: '울쎄라피프라임 300샷', orig: 1500000, event: 1050000 },
        { name: '울쎄라피프라임 600샷', orig: 2700000, event: 1950000 },
        { name: '온다 1만줄', orig: 150000, event: 80000 },
        { name: '온다 4만줄', orig: 450000, event: 290000 },
        { name: '온다 6만줄', orig: 800000, event: 450000 },
        { name: '온다 10만줄', orig: 1200000, event: 650000 },
        { name: '브이로 초음파 100샷', orig: 127000, event: 65000 },
        { name: '브이로 고주파 1000샷', orig: 127000, event: 65000 },
        { name: '브이로 300샷+고주파3000샷', orig: 680000, event: 350000 },
        { name: '슈링크유니버스 100샷', orig: 69000, event: 35000 },
        { name: '슈링크유니버스 600샷', orig: 250000, event: 180000 },
        { name: '민트실 1줄', orig: 194000, event: 99000 },
        { name: '잼버실 1줄', orig: 154000, event: 79000 },
        { name: '롱잼버실 1줄', orig: 250000, event: 150000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '릴리이드', orig: 190000, event: 99000 },
        { name: '아이리쥬란 1cc', orig: 250000, event: 139000 },
        { name: '리쥬란힐러 2cc', orig: 300000, event: 190000 },
        { name: '쥬베룩스킨 2cc', orig: 140000, event: 99000 },
        { name: '쥬베룩볼륨 3cc', orig: 200000, event: 150000 },
        { name: '리쥬란HB 2cc', orig: 450000, event: 250000 },
      ]},
      { name: '레이저/토닝', tag: 'laser', items: [
        { name: '피코토닝 1회', orig: 90000, event: 49000 },
        { name: '듀얼토닝 1회', orig: 100000, event: 65000 },
        { name: '더마브이', orig: 140000, event: 99000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 겨드랑이', orig: 7000, event: 4000 },
        { name: '여성 인중', orig: 3000, event: 2000 },
        { name: '여성 팔하완', orig: 40000, event: 29000 },
        { name: '여성 종아리+무릎', orig: 60000, event: 39000 },
        { name: '남성 인중', orig: 9000, event: 5000 },
        { name: '남성 앞턱', orig: 9000, event: 5000 },
      ]},
    ]
  );

  // 밴스의원 삼성점
  await insertClinic(
    { id: 'vands_samseong', district_id: 'gangnam', name: '밴스의원 삼성점', address: '서울 강남구 테헤란로 511 파크텐삼성 2층', phone: '02-6956-0046', note: '일요일 진료', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스', orig: 1500, event: 900 },
        { name: '제오민 주름 1부위', orig: 35000, event: 19000 },
        { name: '엘러간 주름 1부위', orig: 80000, event: 49000 },
        { name: '국산 사각턱', orig: 8000, event: 4900 },
        { name: '제오민 사각턱', orig: 140000, event: 79000 },
        { name: '엘러간 사각턱', orig: 230000, event: 149000 },
        { name: '모공톡신 1cc', orig: 50000, event: 29000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '눈밑필러(한쪽)', orig: 180000, event: 99000 },
        { name: '턱끝 국산 1cc', orig: 80000, event: 49000 },
        { name: '팔자 국산 1cc', orig: 80000, event: 49000 },
        { name: '동안필러 국산 3cc+', orig: 180000, event: 99000 },
        { name: '동안필러 수입 3cc+', orig: 250000, event: 130000 },
        { name: '쥬블룩스킨 1cc', orig: 40000, event: 29000 },
        { name: '쥬블룩아이 2cc', orig: 350000, event: 190000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '인모드FX 1부위', orig: 35000, event: 19000 },
        { name: '슈링크유니버스울트라 100샷', orig: 36000, event: 19000 },
        { name: '리니어지 100샷', orig: 85000, event: 49000 },
        { name: '온다리프팅 10KJ', orig: 80000, event: 49000 },
        { name: '다이오드리프팅 100샷', orig: 250000, event: 129000 },
        { name: '올리지오 100샷', orig: 350000, event: 199000 },
        { name: '울쎄라피 300샷', orig: 1000000, event: 690000 },
        { name: '민트실 10가닥(한쪽)', orig: 80000, event: 49000 },
        { name: '팻리프팅', orig: 800000, event: 490000 },
        { name: '이마리프팅', orig: 800000, event: 490000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '콜라스터오리지널 1cc', orig: 49000, event: 29000 },
        { name: '콜라스터브라이트닝 1cc', orig: 60000, event: 39000 },
        { name: '콜라스터여드름 1cc', orig: 80000, event: 49000 },
        { name: '넥소좀 1cc', orig: 120000, event: 69000 },
        { name: '연어PDRN 1cc', orig: 120000, event: 69000 },
        { name: '리쥬란힐러 2cc', orig: 260000, event: 135000 },
        { name: '스킨바이브 1cc', orig: 260000, event: 149000 },
        { name: '릴리드 2cc', orig: 120000, event: 69000 },
        { name: '릴리드 5cc', orig: 240000, event: 129000 },
      ]},
      { name: '레이저토닝', tag: 'laser', items: [
        { name: '피코토닝 1회', orig: 9000, event: 4900 },
        { name: '잡티주사', orig: 40000, event: 29000 },
        { name: '엑셀V플러스', orig: 280000, event: 150000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '남성 윗입술+콧수염', orig: 3800, event: 2000 },
        { name: '남성 겨드랑이', orig: 3800, event: 2000 },
        { name: '남성 턱하단패키지', orig: 60000, event: 39000 },
        { name: '여성 윗입술', orig: 1800, event: 1000 },
        { name: '여성 겨드랑이', orig: 3800, event: 2000 },
        { name: '여성 브라질리언(항문제외)', orig: 80000, event: 49000 },
        { name: '여성 브라질리언(항문포함)', orig: 100000, event: 59000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 2단계', orig: 8000, event: 4900 },
        { name: '비타민관리', orig: 18000, event: 9900 },
        { name: 'LED재생레이저', orig: 18000, event: 9900 },
        { name: '블랙헤드관리', orig: 35000, event: 19000 },
        { name: '신데렐라주사', orig: 35000, event: 19000 },
        { name: 'LDM 1+1전체', orig: 45000, event: 29000 },
        { name: '핑크필', orig: 80000, event: 49000 },
        { name: '라라필', orig: 100000, event: 69000 },
        { name: '기본5회패키지', orig: 230000, event: 119000 },
      ]},
      { name: '바디/목라인', tag: 'body', items: [
        { name: '바디인모드 1부위', orig: 180000, event: 99000 },
        { name: '바디리니어지 1부위', orig: 190000, event: 99000 },
        { name: '바디울쎄라피 100샷', orig: 600000, event: 490000 },
        { name: '밴스슬림넥', orig: 180000, event: 99000 },
      ]},
    ]
  );

  // 밴스의원 역삼점
  await insertClinic(
    { id: 'vands_yeoksam', district_id: 'gangnam', name: '밴스의원 역삼점', address: '서울 강남구 테헤란로 121 원빌딩 13층', phone: '02-6956-0046', note: '일요일 진료', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스', orig: 1700, event: 900 },
        { name: '국산 사각턱', orig: 18000, event: 9900 },
        { name: '스킨보톡스 1cc', orig: 45000, event: 24000 },
        { name: '전체 스킨보톡스 5cc', orig: 180000, event: 99000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬란힐러 2cc', orig: 250000, event: 135000 },
        { name: '콜라스터 1cc', orig: 50000, event: 29000 },
        { name: '물광주사 1cc', orig: 90000, event: 49000 },
        { name: '줄기세포주사 3cc', orig: 900000, event: 490000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '인모드FX 전체얼굴', orig: 80000, event: 34000 },
        { name: '울쎄라피 300샷', orig: 1000000, event: 590000 },
        { name: '써마지 600샷+', orig: 1600000, event: 890000 },
      ]},
      { name: '제모(1년무제한)', tag: 'hair_removal', items: [
        { name: '여성 겨드랑이', orig: 90000, event: 49000 },
        { name: '여성 전체얼굴', orig: 600000, event: 350000 },
        { name: '여성 브라질리언', orig: 1500000, event: 990000 },
      ]},
      { name: '레이저토닝', tag: 'laser', items: [
        { name: '피코토닝 1+1', orig: 18000, event: 9900 },
        { name: '피코토닝 20회', orig: 900000, event: 490000 },
        { name: '포텐자 전체얼굴', orig: 95000, event: 49000 },
      ]},
    ]
  );

  // 닥터에버스 강남점
  await insertClinic(
    { id: 'evers_gangnam', district_id: 'gangnam', name: '닥터에버스 강남점', address: '서울 강남구 강남대로 458 8-9층', phone: '02-2138-0777', note: '', color: 'from-amber-500 to-yellow-500' },
    [
      { name: '보톡스/필러', tag: 'botox', items: [
        { name: '보톡스 이벤트', orig: null, event: 8900 },
        { name: '주름보톡스(정가)', orig: 30000, event: null },
        { name: '필러 이벤트', orig: null, event: 39000 },
        { name: '스컬트라 1바이알', orig: null, event: 570000 },
        { name: '덴서티', orig: null, event: 790000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '온다리프팅', orig: null, event: 250000 },
        { name: '인모드FX', orig: null, event: 29900 },
        { name: '리니어지', orig: null, event: 29900 },
      ]},
      { name: '레이저', tag: 'laser', items: [
        { name: '포텐자', orig: null, event: 99000 },
      ]},
    ]
  );

  // 닥터에버스 청담점
  await insertClinic(
    { id: 'evers_cheongdam', district_id: 'gangnam', name: '닥터에버스 청담점', address: '서울 강남구 선릉로 830 4층', phone: '02-2138-0777', note: '', color: 'from-amber-500 to-yellow-500' },
    [
      { name: '보톡스/필러', tag: 'botox', items: [
        { name: '보톡스 이벤트', orig: null, event: 8900 },
        { name: '필러 이벤트', orig: null, event: 39000 },
        { name: '스컬트라 1바이알', orig: null, event: 570000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '온다리프팅', orig: null, event: 250000 },
        { name: '인모드FX', orig: null, event: 29900 },
      ]},
    ]
  );

  console.log('\n=== 완료! ===');
  const { count: clinicCount } = await supabase.from('clinics').select('*', { count: 'exact', head: true });
  const { count: treatCount } = await supabase.from('treatments').select('*', { count: 'exact', head: true });
  console.log(`총 병원: ${clinicCount}개, 총 시술: ${treatCount}개`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
