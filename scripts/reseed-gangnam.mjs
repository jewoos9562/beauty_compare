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
  console.log('=== 강남구 전체 재시드 (공식 홈페이지 기준) ===\n');

  // 1. 톡스앤필 강남본점 (toxnfill1.com)
  await insertClinic(
    { id: 'toxnfill_gangnam', district_id: 'gangnam', name: '톡스앤필 강남본점', address: '서울 서초구 강남대로 415 대동빌딩 10-11층', phone: '02-537-4842', note: 'VAT 별도', color: 'from-violet-500 to-purple-500' },
    [
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피 프라임 100샷', orig: 460000, event: 390000 },
        { name: '울쎄라피 프라임 300샷+써마지FLX 600샷', orig: 3280000, event: 2690000 },
        { name: '울쎄라피 프라임 400샷+써마지FLX 600샷', orig: 3580000, event: 2990000 },
        { name: '울쎄라피 프라임 600샷+써마지FLX 600샷', orig: 4380000, event: 3590000 },
      ]},
      { name: '보톡스', tag: 'botox', items: [
        { name: '사각턱 50U (국산/소분)', event: 19000 },
        { name: '사각턱 50U (국산/눈앞개봉)', orig: 50000, event: 35000 },
        { name: '사각턱 50U (코어톡스)', orig: 70000, event: 49000 },
        { name: '사각턱 50U (제오민/눈앞개봉)', orig: 265000, event: 135000 },
        { name: '사각턱 50U (제오민/소분)', orig: 135000, event: 89000 },
        { name: '광경근 보톡스 100U (수입)', orig: 1000000, event: 800000 },
        { name: '광경근 보톡스 100U (국산)', orig: 800000, event: 600000 },
        { name: '턱보톡스(국산)+윤곽주사 1부위', orig: 85000, event: 60000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '레티젠 2cc 1회', orig: 490000, event: 399000 },
        { name: '레티젠 2cc 3회', orig: 1470000, event: 1190000 },
        { name: '벨로테로 리바이브 1cc', orig: 590000, event: 390000 },
      ]},
    ]
  );

  // 2. 톡스앤필 압구정점 (toxnfill2.com)
  await insertClinic(
    { id: 'toxnfill_apgujeong', district_id: 'gangnam', name: '톡스앤필 압구정점', address: '서울 강남구 논현로168길 18 동신빌딩 5층', phone: '02-542-4842', note: 'VAT 별도', color: 'from-violet-500 to-purple-500' },
    [
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피 프라임 300샷', orig: 1500000, event: 1190000 },
        { name: '4세대 써마지FLX 600샷', orig: 2700000, event: 1890000 },
        { name: '울써마지(울쎄라300+써마지600)', orig: 4200000, event: 2790000 },
        { name: '온다 6만줄 1회', orig: 650000, event: 440000 },
        { name: '온다 6만줄 3회', orig: 1750000, event: 1090000 },
        { name: '버츄RF 300샷 1회', orig: 750000, event: 400000 },
        { name: '버츄RF 300샷 3회', orig: 2000000, event: 1050000 },
        { name: '슈링크유니버스 300샷 (부원장 평일)', orig: 310000, event: 160000 },
      ]},
      { name: '보톡스', tag: 'botox', items: [
        { name: '얼굴전체+턱보톡스 100U(제오민)', orig: 700000, event: 490000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬하이 4cc 1회', orig: 600000, event: 350000 },
        { name: '리쥬하이 4cc 3회', orig: 1800000, event: 1000000 },
        { name: '스킨바이브 1cc+LDM 1회', orig: 590000, event: 350000 },
        { name: '스킨바이브 2cc+LDM 1회', orig: 1180000, event: 600000 },
        { name: '리쥬란HB Plus 3cc', orig: 890000, event: 450000 },
        { name: 'ASCE+ 엑소좀 1회', orig: 450000, event: 350000 },
        { name: '아이리쥬란 10cc', orig: 2000000, event: 1200000 },
        { name: '아이리쥬란 1cc', orig: 200000, event: 150000 },
        { name: '아이리쥬란 3cc', orig: 600000, event: 420000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 1회', orig: 75000, event: 39000 },
        { name: '아쿠아필 5회', orig: 395000, event: 200000 },
        { name: '크라이오셀+모델링팩+LED', orig: 90000, event: 50000 },
      ]},
      { name: '주사/스컬트라', tag: 'skinbooster', items: [
        { name: '고우리 1vial', orig: 600000, event: 490000 },
        { name: '리투오 1vial', orig: 900000, event: 700000 },
        { name: '리투오 3vial', orig: 2700000, event: 1890000 },
      ]},
      { name: '목주름', tag: 'neck', items: [
        { name: '목주름 베이직', orig: 510000, event: 490000 },
        { name: '목주름 프리미엄', orig: 1050000, event: 890000 },
        { name: '목주름 스페셜', orig: 1700000, event: 1150000 },
        { name: '목주름 버츄 1회', orig: 290000, event: 150000 },
      ]},
    ]
  );

  // 3. 톡스앤필 신논현점 (toxnfill9.com)
  await insertClinic(
    { id: 'toxnfill_sinnonhyeon', district_id: 'gangnam', name: '톡스앤필 신논현점', address: '서울 강남구 강남대로 484 2층', phone: '02-6951-4882', note: 'VAT 별도', color: 'from-violet-500 to-purple-500' },
    [
      { name: '리프팅', tag: 'lifting', items: [
        { name: '슈링크유니버스 600샷', orig: 240000, event: 129000 },
        { name: '티타늄 풀페이스', orig: 1000000, event: 529000 },
        { name: '온다 무제한', orig: 3900000, event: 1990000 },
        { name: '온다30000J+슈링크300샷', orig: 350000, event: 199000 },
        { name: '바디/페이스 온다 10만줄', orig: 1160000, event: 590000 },
        { name: '써마지FLX300+아이써마지225', orig: 3500000, event: 1890000 },
        { name: '울쎄라피프라임 300샷', orig: 1850000, event: 990000 },
      ]},
      { name: '필러/스킨부스터', tag: 'filler', items: [
        { name: '스컬트라 1바이알', orig: 1050000, event: 549000 },
        { name: '리쥬란입술HB 1cc', orig: 390000, event: 199000 },
        { name: '리쥬란힐러 4cc 3회+LDM 3회', orig: 1580000, event: 798000 },
        { name: '레티젠 2cc 3회', orig: 1650000, event: 850000 },
        { name: '쥬베룩볼륨 1vial 3회', orig: 2450000, event: 1290000 },
        { name: '레디어스 2vial', orig: 2650000, event: 1350000 },
        { name: '리투오 1vial', orig: 1180000, event: 600000 },
      ]},
      { name: '보톡스', tag: 'botox', items: [
        { name: '사각턱톡신 50U', orig: 45000, event: 25900 },
        { name: '(코어톡스) 얼굴전체 보톡스', orig: 300000, event: 159000 },
      ]},
      { name: '레이저/스킨케어', tag: 'laser', items: [
        { name: '포텐자 전체얼굴 500샷', orig: 200000, event: 119000 },
        { name: '아쿠아필 1회', orig: 57000, event: 29000 },
      ]},
    ]
  );

  // 4. 유앤아이 강남점 (uni114.co.kr)
  await insertClinic(
    { id: 'uni_gangnam', district_id: 'gangnam', name: '유앤아이 강남점', address: '서울 강남구 강남대로 470 808타워 6층', phone: '02-555-6020', note: '', color: 'from-emerald-500 to-teal-500' },
    [
      { name: '보톡스 (국산)', tag: 'botox', items: [
        { name: '턱보톡스', orig: 25000, event: 19000 },
        { name: '주름보톡스 1부위', orig: 19000, event: 15000 },
        { name: '더모톡신 얼굴전체', orig: 89000, event: 59000 },
        { name: '겨드랑이다한증 100U', orig: 99000, event: 65000 },
        { name: '바디보톡스 100U', orig: 125000, event: 65000 },
      ]},
      { name: '보톡스 (프리미엄 국산)', tag: 'botox', items: [
        { name: '턱보톡스 (프리미엄)', orig: 59000, event: 40000 },
        { name: '주름보톡스 1부위 (프리미엄)', orig: 45000, event: 29000 },
        { name: '더모톡신 얼굴전체 (프리미엄)', orig: 99000, event: 69000 },
      ]},
      { name: '보톡스 (독일산)', tag: 'botox', items: [
        { name: '턱보톡스 (독일산)', orig: 150000, event: 110000 },
        { name: '주름보톡스 1부위 (독일산)', orig: 65000, event: 55000 },
        { name: '더모톡신 얼굴전체 (독일산)', orig: 159000, event: 99000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '쥬베룩 스킨 1cc', orig: 69000, event: 49000 },
        { name: '쥬베룩 볼륨 1cc', orig: 89000, event: 55000 },
        { name: '쥬베룩 볼륨 1vial', orig: 590000, event: 390000 },
        { name: '쥬비덤 1cc', orig: 289000, event: 270000 },
        { name: '레스틸렌 아이라이트 0.5cc', orig: 250000, event: 190000 },
        { name: '스컬트라 1바이알', orig: 1200000, event: 650000 },
        { name: '레디어스 1시린지', orig: 950000, event: 790000 },
        { name: '리바이브 1cc', orig: 550000, event: 400000 },
        { name: '스킨바이브 1cc', orig: 220000, event: 170000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피 프라임 100샷', orig: 600000, event: 380000 },
        { name: '울쎄라피 프라임 300샷', orig: 1500000, event: 1050000 },
        { name: '울쎄라피 프라임 600샷', orig: 2600000, event: 1950000 },
        { name: '아이써마지 225샷', orig: 1450000, event: 750000 },
        { name: '써마지 300샷', orig: 1900000, event: 990000 },
        { name: '써마지 600샷', orig: 2900000, event: 1690000 },
        { name: '올리지오X 300샷', orig: 790000, event: 400000 },
        { name: '슈링크 유니버스 울트라F 100샷', orig: 55000, event: 30000 },
        { name: '온다 6만줄', orig: 890000, event: 490000 },
        { name: '온다 20만줄', orig: 1590000, event: 1090000 },
        { name: '소프웨이브 100샷', orig: 1700000, event: 900000 },
        { name: '티타늄 8만줄+진정관리', orig: 850000, event: 790000 },
        { name: '볼뉴머 100샷', orig: 250000, event: 140000 },
        { name: '볼뉴머 300샷', orig: 690000, event: 350000 },
        { name: '실리프팅 1줄당', orig: 150000, event: 99000 },
      ]},
      { name: '색소', tag: 'laser', items: [
        { name: '피코플러스 토닝 1회', orig: 100000, event: 79000 },
        { name: '더마V레이저 1회', orig: 130000, event: 100000 },
        { name: '더마V레이저 5회', orig: 650000, event: 350000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 인중/앞턱 1회', orig: 15000, event: 10000 },
        { name: '여성 겨드랑이 5회', orig: 45000, event: 39000 },
        { name: '여성 브라질리언(항문제외) 5회', orig: 400000, event: 270000 },
        { name: '남성 인중/앞턱 1회', orig: 25000, event: 20000 },
      ]},
      { name: '바디', tag: 'body', items: [
        { name: '바디인모드 1부위', orig: 150000, event: 99000 },
        { name: '바디온다리프팅 12만줄', orig: 990000, event: 690000 },
        { name: '바디슈링크 500샷', orig: 450000, event: 390000 },
      ]},
    ]
  );

  // 5. 유앤아이 선릉점 (sluni114.co.kr)
  await insertClinic(
    { id: 'uni_seolleung', district_id: 'gangnam', name: '유앤아이 선릉점', address: '서울 강남구 테헤란로 421 암천빌딩 2층', phone: '02-552-6020', note: '', color: 'from-emerald-500 to-teal-500' },
    [
      { name: '보톡스 (국산)', tag: 'botox', items: [
        { name: '주름 1부위 (국산)', orig: 15000, event: 9000 },
        { name: '턱 (국산)', orig: 45000, event: 25000 },
        { name: '더모톡신 (국산)', orig: 150000, event: 89000 },
        { name: '종아리/승모근 100U (국산)', orig: 150000, event: 99000 },
      ]},
      { name: '보톡스 (프리미엄)', tag: 'botox', items: [
        { name: '주름 1부위 (프리미엄)', orig: 30000, event: 17000 },
        { name: '턱 (프리미엄)', orig: 95000, event: 50000 },
        { name: '더모톡신 (프리미엄)', orig: 200000, event: 139000 },
      ]},
      { name: '보톡스 (독일산)', tag: 'botox', items: [
        { name: '턱 (독일산)', orig: 170000, event: 90000 },
        { name: '퓨어화이트주사 (독일산)', orig: 360000, event: 189000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '국산 필러 1cc', orig: 130000, event: 99000 },
        { name: '외국산 필러 1cc', orig: 450000, event: 350000 },
        { name: '데옥시콜산 2cc 1회', orig: 350000, event: 190000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라피 프라임 Eye 100샷', orig: 750000, event: 400000 },
        { name: '울쎄라피 프라임 100샷', orig: 600000, event: 380000 },
        { name: '울쎄라피 프라임 300샷', orig: 1500000, event: 1050000 },
        { name: '울쎄라피 프라임 600샷', orig: 2700000, event: 1950000 },
        { name: '세르프 300샷', orig: 1800000, event: 1050000 },
        { name: '세르프 600샷', orig: 3000000, event: 1850000 },
        { name: '슈링크 유니버스 100샷', orig: 69000, event: 35000 },
        { name: '슈링크 유니버스 600샷', orig: 250000, event: 180000 },
        { name: '브이로 300샷+RF3000 1회', orig: 680000, event: 350000 },
        { name: '온다 4만줄', orig: 450000, event: 290000 },
        { name: '온다 6만줄', orig: 800000, event: 450000 },
        { name: '온다 10만줄', orig: 1200000, event: 650000 },
        { name: '실펌X 1회+진정관리', orig: 450000, event: 300000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '릴리이드', orig: 135000, event: 69000 },
        { name: '아이리쥬란 1cc', orig: 250000, event: 139000 },
        { name: '리쥬란힐러 2cc', orig: 300000, event: 190000 },
        { name: '리쥬란HB 2cc', orig: 450000, event: 250000 },
        { name: '쥬베룩스킨 2cc', orig: 140000, event: 99000 },
        { name: '쥬베룩볼륨 3cc', orig: 200000, event: 150000 },
        { name: '쥬베룩아이 1회', orig: 350000, event: 200000 },
        { name: '스킨바이브 1cc', orig: 390000, event: 250000 },
      ]},
      { name: '레이저/토닝', tag: 'laser', items: [
        { name: '콜라겐토닝 1회', orig: 50000, event: 29000 },
        { name: '피코토닝 1회', orig: 90000, event: 49000 },
        { name: '듀얼토닝 1회', orig: 100000, event: 65000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 겨드랑이 1회', orig: 7000, event: 4000 },
        { name: '여성 인중 1회', orig: 3000, event: 2000 },
        { name: '남성 인중 1회', orig: 9000, event: 5000 },
        { name: '여성 종아리+무릎 1회', orig: 60000, event: 39000 },
      ]},
    ]
  );

  // 6. 데이뷰 강남점 (daybeauclinic07.com - 첫방문 이벤트가)
  await insertClinic(
    { id: 'dayview_gangnam', district_id: 'gangnam', name: '데이뷰 강남점', address: '서울 강남구 강남대로 494', phone: '02-2138-2225', note: 'VAT 별도, 체험가=카톡플친', color: 'from-orange-500 to-amber-500' },
    [
      { name: '첫방문 이벤트', tag: 'first', items: [
        { name: '인모드 5분 (FX or FORMA)', orig: 76000, event: 39000 },
        { name: '국산 턱라인 스킨보톡스 2cc', orig: 69000, event: 39000 },
        { name: '바디보톡스 100U (국산)', orig: 89000, event: 69000 },
        { name: '슈링크유니버스 300샷', orig: 125000, event: 69000 },
        { name: '국산 필러 1cc', orig: 120000, event: 69000 },
        { name: '듀얼토닝 (피코+제네시스)', orig: 135000, event: 69000 },
        { name: '리쥬란HB 1cc', orig: 229000, event: 99000 },
        { name: '수입프리미엄 주름보톡스 1+1', orig: 190000, event: 99000 },
        { name: '아쿠아필+포텐자RF', orig: 290000, event: 159000 },
        { name: '바디인모드 FX 10분', orig: 380000, event: 199000 },
        { name: '온다리프팅 30,000J', orig: 430000, event: 220000 },
        { name: '티타늄 한부위', orig: 490000, event: 249000 },
        { name: '아이소프웨이브 50샷', orig: 750000, event: 390000 },
        { name: '엘란쎄 1cc', orig: 1200000, event: 590000 },
      ]},
    ]
  );

  // 7. 예쁨주의쁨 강남본점 (sinnonhyeon.ppeum.com)
  await insertClinic(
    { id: 'ppeum_gangnam', district_id: 'gangnam', name: '예쁨주의쁨 강남본점', address: '서울 강남구 강남대로 470 808타워 13-14층', phone: '02-593-3344', note: '', color: 'from-pink-500 to-rose-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 턱보톡스 50U', event: 35000 },
        { name: '국산 주름보톡스 1부위', event: 29000 },
        { name: '국산 얼굴전체 스킨보톡스', event: 110000 },
        { name: '프리미엄 국산 턱보톡스 50U', orig: 100000, event: 59000 },
        { name: '프리미엄 국산 주름보톡스 1부위', orig: 49000, event: 39000 },
        { name: '수입 독일산 턱보톡스 50U', orig: 120000, event: 99000 },
        { name: '수입 독일산 주름보톡스 1부위', orig: 60000, event: 49000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '리프테라2 펜타입 1000샷 (한정가)', orig: 19500, event: 9900 },
        { name: '리프테라2 3000샷', orig: 111000, event: 65000 },
        { name: '슈링크유니버스 울트라 100샷+PS주사3cc', orig: 57000, event: 29000 },
        { name: '슈링크유니버스 울트라 100샷 (300이상)', orig: 49000, event: 35000 },
        { name: '포텐자 1회 (한정가)', orig: 116000, event: 59000 },
        { name: '볼뉴머 100샷', orig: 190000, event: 129000 },
        { name: '울트라인 100샷', orig: 350000, event: 249000 },
        { name: '페이스온다 10KJ', orig: 190000, event: 110000 },
        { name: '포트라 리프팅 20KJ', orig: 490000, event: 349000 },
        { name: '티타늄 40KJ+40KJ (한정가)', orig: 1360000, event: 690000 },
        { name: 'V핏 티타늄+인모드FX+독일산턱톡신', orig: 1069000, event: 690000 },
      ]},
      { name: '윤곽/필러', tag: 'filler', items: [
        { name: '윤곽주사 3cc (한정가)', orig: 9900, event: 5000 },
        { name: 'PS주사 3cc+3cc (한정가)', orig: 69000, event: 35000 },
        { name: '눈밑동안주사', orig: 190000, event: 99000 },
        { name: '원데이 눈밑복원 (벨로테로+아이볼뉴머200)', orig: 780000, event: 490000 },
        { name: '국산필러 1cc (체험)', orig: 100000, event: 59000 },
        { name: '입술필러패키지 (체험)', orig: 129000, event: 69000 },
        { name: '쥬베룩 볼륨 1cc (체험)', orig: 89000, event: 49000 },
      ]},
      { name: '레이저/피부', tag: 'laser', items: [
        { name: '피코토닝+아쿠아필+촉촉팩 1회', orig: 88000, event: 50000 },
        { name: '피코토닝+제네시스 (한정가)', orig: 118000, event: 60000 },
        { name: '피코토닝+제네시스+촉촉팩+LED 10회', orig: 1330000, event: 690000 },
        { name: '피코토닝 1회 (체험)', orig: 19500, event: 9900 },
        { name: '리팟레이저 5mm', orig: 450000, event: 290000 },
      ]},
      { name: '제모', tag: 'hair_removal', items: [
        { name: '여성 겨드랑이 5회 (체험)', orig: 29000, event: 19000 },
        { name: '여성 종아리 5회 (무릎포함)', orig: 250000, event: 149000 },
        { name: '남성 얼굴전체 5회', orig: 574000, event: 290000 },
      ]},
      { name: '바디', tag: 'body', items: [
        { name: '국산 승모근보톡스 100U (한정가)', orig: 77000, event: 39000 },
        { name: '팔뚝지방분해주사 50cc 1회', orig: 120000, event: 79000 },
        { name: '울트라인 바디 100샷', orig: 590000, event: 490000 },
      ]},
    ]
  );

  // 8. 밴스 강남점 (gangnam.vandsclinic.co.kr)
  await insertClinic(
    { id: 'vands_gangnam', district_id: 'gangnam', name: '밴스의원 강남점', address: '서울 서초구 강남대로 411 DS타워 12-13층', phone: '02-6956-0046', note: 'VAT 별도', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스 1부위', orig: 1500, event: 900 },
        { name: '국산 사각턱보톡스', orig: 35000, event: 19000 },
        { name: '제오민 주름 1부위', orig: 55000, event: 29000 },
        { name: '제오민 사각턱', orig: 140000, event: 79000 },
        { name: '엘러간 주름 1부위', orig: 100000, event: 59000 },
        { name: '엘러간 사각턱', orig: 250000, event: 149000 },
        { name: '모공톡신 1cc', orig: 50000, event: 29000 },
        { name: '승모근/종아리 100U', orig: 50000, event: 29000 },
        { name: '밴스슬림넥', orig: 180000, event: 99000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '눈밑필러 (1쪽)', orig: 80000, event: 49000 },
        { name: '턱끝필러 국산 1cc', orig: 80000, event: 49000 },
        { name: '무제한 입술필러', orig: 160000, event: 89000 },
        { name: '무제한 애교필러', orig: 160000, event: 89000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '슈링크유니버스울트라 100샷', orig: 17000, event: 9900 },
        { name: '슈링크유니버스울트라 300샷', orig: 160000, event: 89000 },
        { name: '울쎄라 300샷', orig: 1200000, event: 690000 },
        { name: '울쎄라프라임 300샷', orig: 1600000, event: 890000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '콜라스터 오리지널 1cc', orig: 49000, event: 29000 },
        { name: '콜라스터 PDRN 1cc', orig: 120000, event: 69000 },
        { name: '리쥬란힐러 2cc', orig: 250000, event: 135000 },
      ]},
      { name: '레이저토닝', tag: 'laser', items: [
        { name: '피코토닝 1+1', orig: 18000, event: 9900 },
        { name: '기미주사 1부위', orig: 40000, event: 29000 },
      ]},
      { name: '제모 (1년)', tag: 'hair_removal', items: [
        { name: '남성 인중+콧수염', orig: 180000, event: 99000 },
        { name: '여성 인중/겨드랑이', orig: 97000, event: 49000 },
        { name: '여성 브라질리언(항문X)', orig: 1600000, event: 890000 },
        { name: '여성 브라질리언(항문O)', orig: 1800000, event: 990000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 2단계', orig: 8000, event: 4900 },
        { name: '비타민관리', orig: 18000, event: 9900 },
        { name: '블랙헤드관리', orig: 35000, event: 19000 },
      ]},
      { name: '바디', tag: 'body', items: [
        { name: '제로팻주사 1부위(복부외)', orig: 550000, event: 300000 },
        { name: '제로팻주사 1부위(복부)', orig: 950000, event: 500000 },
      ]},
    ]
  );

  // 9. 밴스 삼성점 (samseong.vandsclinic.co.kr)
  await insertClinic(
    { id: 'vands_samseong', district_id: 'gangnam', name: '밴스의원 삼성점', address: '서울 강남구 테헤란로 511 파크텐삼성 2층', phone: '02-6956-0046', note: 'VAT 별도', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스 1부위', orig: 1700, event: 900 },
        { name: '국산 사각턱', orig: 35000, event: 19000 },
        { name: '제오민 주름 1부위', orig: 35000, event: 19000 },
        { name: '제오민 사각턱', orig: 140000, event: 79000 },
        { name: '엘러간 주름 1부위', orig: 80000, event: 49000 },
        { name: '엘러간 사각턱', orig: 280000, event: 149000 },
        { name: '모공톡신 1cc', orig: 50000, event: 29000 },
        { name: '밴스슬림넥', orig: 180000, event: 99000 },
      ]},
      { name: '필러/실리프팅', tag: 'filler', items: [
        { name: '턱끝필러 1cc', orig: 96000, event: 49000 },
        { name: '팔자필러 1cc', orig: 96000, event: 49000 },
        { name: '무제한 입술필러 (국산)', orig: 160000, event: 89000 },
        { name: '무제한 입술필러 (수입)', orig: 400000, event: 290000 },
        { name: '동안필러 국산 1cc', orig: 180000, event: 99000 },
        { name: '민트실 1줄', orig: 96000, event: 49000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '울쎄라 300샷', orig: 1000000, event: 690000 },
        { name: '써마지FLX 300샷', orig: 1600000, event: 890000 },
        { name: '써마지FLX 600샷', orig: 3200000, event: 1780000 },
        { name: '아이써마지 225샷', orig: 1900000, event: 990000 },
        { name: '온다 10KJ', orig: 80000, event: 49000 },
        { name: '온다 30KJ', orig: 250000, event: 139000 },
        { name: '온다 60KJ', orig: 500000, event: 269000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬란힐러 2cc', orig: 260000, event: 135000 },
        { name: '밴스란힐러 1cc', orig: 80000, event: 49000 },
        { name: '콜라스터 오리지널 1cc', orig: 49000, event: 29000 },
        { name: '쥬비덤스킨 1cc', orig: 40000, event: 29000 },
        { name: '쥬비덤아이 2cc', orig: 350000, event: 190000 },
        { name: '쥬비덤볼륨 1Vial', orig: 600000, event: 350000 },
        { name: '릴리드 2cc', orig: 120000, event: 69000 },
        { name: '스킨바이브 1cc', orig: 260000, event: 149000 },
        { name: '셀러덤 6cc', orig: 1000000, event: 590000 },
        { name: '리바이브 1cc', orig: 400000, event: 290000 },
      ]},
      { name: '레이저토닝', tag: 'laser', items: [
        { name: '피코토닝 1회', orig: 9000, event: 4900 },
        { name: '기미주사', orig: 50000, event: 29000 },
        { name: '엑셀V플러스 싱글', orig: 280000, event: 150000 },
        { name: '엑셀V플러스 듀얼', orig: 449000, event: 249000 },
      ]},
      { name: '제모 (남성 1년)', tag: 'hair_removal', items: [
        { name: '남성 인중+콧수염', orig: 180000, event: 99000 },
        { name: '남성 하관전체', orig: 550000, event: 300000 },
        { name: '여성 인중/겨드랑이', orig: 80000, event: 49000 },
        { name: '여성 브라질리언(항문O)', orig: 1800000, event: 990000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 2단계', orig: 8000, event: 4900 },
        { name: '비타민관리', orig: 18000, event: 9900 },
        { name: 'LED재생레이저', orig: 18000, event: 9900 },
      ]},
    ]
  );

  // 10. 밴스 역삼점 (yeoksamskin.vandsclinic.co.kr)
  await insertClinic(
    { id: 'vands_yeoksam', district_id: 'gangnam', name: '밴스의원 역삼점', address: '서울 강남구 테헤란로 121 원빌딩 13층', phone: '02-6956-0046', note: 'VAT 별도', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스 1부위', orig: 1500, event: 900 },
        { name: '국산 사각턱', orig: 18000, event: 9900 },
        { name: '스킨보톡스 1cc', orig: 50000, event: 24000 },
        { name: '제오민 주름 1부위', orig: 55000, event: 29000 },
        { name: '제오민 사각턱', orig: 140000, event: 79000 },
        { name: '엘러간 주름 1부위', orig: 100000, event: 59000 },
        { name: '엘러간 사각턱', orig: 250000, event: 149000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '턱끝필러 1cc', orig: 96000, event: 49000 },
        { name: '팔자필러 1cc', orig: 96000, event: 49000 },
        { name: '무제한 입술필러', orig: 160000, event: 89000 },
        { name: '동안필러 국산 1cc', orig: 180000, event: 99000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '인모드FX 얼굴전체', orig: 60000, event: 34000 },
        { name: '인모드 FX+포르마 얼굴전체', orig: 180000, event: 99000 },
        { name: '슈링크유니버스울트라 100샷', orig: 19000, event: 8500 },
        { name: '슈링크유니버스울트라 300샷', orig: 90000, event: 49000 },
        { name: '리니지 300샷', orig: 250000, event: 149000 },
        { name: '울쎄라프라임 300샷', orig: 1200000, event: 690000 },
        { name: '써마지FLX 300+샷', orig: 1600000, event: 890000 },
        { name: '온다 60KJ', orig: 750000, event: 399000 },
        { name: '볼뉴머 300샷', orig: 400000, event: 229000 },
        { name: '티타늄 얼굴전체 40KJ', orig: 750000, event: 390000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬란힐러 2cc', orig: 250000, event: 135000 },
        { name: '콜라스터 오리지널 1cc', orig: 49000, event: 29000 },
        { name: '쥬비덤스킨 1cc', orig: 80000, event: 39000 },
        { name: '셀러덤 6cc', orig: 1000000, event: 590000 },
        { name: '리바이브 1cc', orig: 550000, event: 290000 },
        { name: '래디어스 얼굴전체', orig: 1300000, event: 790000 },
      ]},
      { name: '레이저', tag: 'laser', items: [
        { name: '피코슈어 토닝', event: 29000 },
        { name: '피코토닝 1+1', orig: 18000, event: 9900 },
        { name: '피코토닝 10+10', orig: 900000, event: 490000 },
        { name: '포텐자 얼굴전체', orig: 80000, event: 49000 },
      ]},
      { name: '제모 (1년)', tag: 'hair_removal', items: [
        { name: '남성 인중+콧수염', orig: 180000, event: 99000 },
        { name: '여성 인중/겨드랑이', orig: 97000, event: 49000 },
        { name: '여성 브라질리언', orig: 1900000, event: 990000 },
      ]},
      { name: '바디', tag: 'body', items: [
        { name: '제로팻주사 1부위(복부외)', orig: 550000, event: 300000 },
        { name: '제로팻주사 1부위(복부)', orig: 950000, event: 500000 },
      ]},
    ]
  );

  // 11. 밴스 청담점 NEW (cheongdam.vandsclinic.co.kr)
  await insertClinic(
    { id: 'vands_cheongdam', district_id: 'gangnam', name: '밴스의원 청담점', address: '서울 강남구 선릉로 822 메가와이즈빌딩 3층', phone: '02-6956-0046', note: 'VAT 별도', color: 'from-blue-500 to-cyan-500' },
    [
      { name: '보톡스', tag: 'botox', items: [
        { name: '국산 주름보톡스 1부위', orig: 1900, event: 1000 },
        { name: '독일산 주름보톡스 1부위', orig: 37000, event: 19000 },
        { name: '미국산 주름보톡스 1부위', orig: 60000, event: 39000 },
        { name: '국산 사각턱', orig: 8500, event: 4900 },
        { name: '독일산 사각턱', orig: 140000, event: 79000 },
        { name: '미국산 사각턱', orig: 230000, event: 129000 },
        { name: '모공톡신 1cc', orig: 50000, event: 29000 },
        { name: '밴스슬림넥', orig: 180000, event: 99000 },
      ]},
      { name: '필러', tag: 'filler', items: [
        { name: '눈밑필러 한쪽', orig: 280000, event: 149000 },
        { name: '턱끝필러 국산 1cc', orig: 130000, event: 69000 },
        { name: '무제한 입술필러', orig: 188000, event: 99000 },
        { name: '동안필러 국산 1cc (3cc이상)', orig: 180000, event: 99000 },
      ]},
      { name: '리프팅', tag: 'lifting', items: [
        { name: '인모드FX 얼굴전체', orig: 140000, event: 79000 },
        { name: '인모드 FX+Forma 얼굴전체', orig: 300000, event: 159000 },
        { name: '슈링크유니버스울트라 100샷', orig: 35000, event: 19000 },
        { name: '슈링크유니버스울트라 300샷', orig: 160000, event: 89000 },
        { name: '올리지오 100샷', orig: 180000, event: 99000 },
        { name: '울쎄라피프라임 100샷', orig: 550000, event: 290000 },
        { name: '세르프 300샷', orig: 1650000, event: 890000 },
        { name: '온다 60KJ', orig: 580000, event: 299000 },
        { name: '써마지FLX 300샷', orig: 1600000, event: 890000 },
        { name: '아이써마지 225샷', orig: 1900000, event: 990000 },
      ]},
      { name: '스킨부스터', tag: 'skinbooster', items: [
        { name: '리쥬란힐러 2cc', orig: 250000, event: 135000 },
        { name: '콜라스터 오리지널 1cc', orig: 49000, event: 29000 },
        { name: '쥬베룩스킨 1cc', orig: 85000, event: 49000 },
        { name: '릴리이드 2cc', orig: 120000, event: 69000 },
        { name: '포텐자 얼굴전체', orig: 130000, event: 69000 },
        { name: '셀르디엠 1vial', orig: 1000000, event: 590000 },
        { name: '레디어스 얼굴전체', orig: 1200000, event: 640000 },
        { name: '리바이브 1cc', orig: 570000, event: 290000 },
      ]},
      { name: '레이저토닝', tag: 'laser', items: [
        { name: '피코토닝 1+1', orig: 18000, event: 9900 },
        { name: '기미주사 1부위', orig: 40000, event: 29000 },
        { name: '엑셀V플러스 싱글', orig: 140000, event: 75000 },
      ]},
      { name: '제모 (체험1회)', tag: 'hair_removal', items: [
        { name: '남성 인중+콧수염', orig: 1900, event: 1000 },
        { name: '남성 겨드랑이', orig: 35000, event: 19000 },
        { name: '여성 겨드랑이/인중', orig: 18000, event: 9900 },
        { name: '여성 브라질리언(항문X)', orig: 130000, event: 69000 },
      ]},
      { name: '스킨케어', tag: 'skincare', items: [
        { name: '아쿠아필 2단계', orig: 9000, event: 4900 },
        { name: '비타민관리', orig: 18000, event: 9900 },
        { name: '핑크필', orig: 80000, event: 49000 },
        { name: '라라필', orig: 120000, event: 69000 },
      ]},
      { name: '바디', tag: 'body', items: [
        { name: '바디인모드 1부위', orig: 180000, event: 99000 },
        { name: '퀵제로팻 바디 1부위', orig: 190000, event: 99000 },
        { name: '제로팻주사 1부위(복부외)', orig: 550000, event: 300000 },
      ]},
    ]
  );

  // 닥터에버스 강남점, 청담점은 JS SPA로 상세 가격 추출 불가 → 기존 데이터 유지 (skip)
  console.log('\n  ℹ 닥터에버스 강남점/청담점 — JS SPA로 가격 추출 불가, 기존 데이터 유지');

  console.log('\n=== 강남구 재시드 완료! ===');
  const { count } = await supabase.from('clinics').select('*', { count: 'exact', head: true }).eq('district_id', 'gangnam');
  console.log(`강남구 총 병원: ${count}개`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
