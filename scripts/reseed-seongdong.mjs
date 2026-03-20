import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opvfdywolzgiqaraoyot.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertClinic(clinic, categories) {
  const { error: clinicErr } = await supabase.from('clinics').upsert(clinic, { onConflict: 'id' });
  if (clinicErr) throw new Error(`Clinic ${clinic.id}: ${clinicErr.message}`);

  const { error: delErr } = await supabase.from('categories').delete().eq('clinic_id', clinic.id);
  if (delErr) throw new Error(`Delete cats ${clinic.id}: ${delErr.message}`);

  for (const cat of categories) {
    const { data: catRow, error: catErr } = await supabase
      .from('categories')
      .insert({ clinic_id: clinic.id, name: cat.name, sort_order: cat.sort_order })
      .select('id')
      .single();
    if (catErr) throw new Error(`Cat ${cat.name}: ${catErr.message}`);

    if (cat.items?.length) {
      const rows = cat.items.map((it, idx) => ({
        category_id: catRow.id,
        name: it.name,
        orig_price: it.orig ?? null,
        event_price: it.event ?? null,
        base_price: it.base ?? null,
        sort_order: idx,
      }));
      const { error: itErr } = await supabase.from('treatments').insert(rows);
      if (itErr) throw new Error(`Items ${cat.name}: ${itErr.message}`);
    }
    console.log(`    ✓ ${cat.name} (${cat.items?.length ?? 0}개)`);
  }
}

async function main() {
  console.log('=== 성동구 전체 재시드 (공식 홈페이지 기준) ===\n');

  // ────────────────────────────────────────────────
  // 1. 밴스의원 성수점 (seongsu.vandsclinic.co.kr)
  // ────────────────────────────────────────────────
  await insertClinic(
    { id: 'vands_seongsu', name: '밴스의원 성수점', district_id: 'seongdong', address: '서울 성동구 성수동', phone: '' },
    [
      {
        name: '스킨케어', sort_order: 0,
        items: [
          { name: '아쿠아필 2단계', orig: 8000, event: 4500, tags: ['skincare'], is_popular: true },
          { name: '비타민관리', orig: 18000, event: 9900, tags: ['skincare'] },
          { name: 'LDM 얼굴전체', orig: 48000, event: 25000, tags: ['skincare'] },
          { name: '핑크필', orig: 80000, event: 49000, tags: ['skincare'] },
          { name: '라라필', orig: 125000, event: 69000, tags: ['skincare'] },
        ],
      },
      {
        name: '보톡스', sort_order: 1,
        items: [
          { name: '국산 주름 1+1부위', orig: 1800, event: 1000, tags: ['botox'], is_popular: true },
          { name: '국산 사각턱', orig: 35000, event: 19000, tags: ['botox'], is_popular: true },
          { name: '제오민 주름 1부위', orig: 55000, event: 29000, tags: ['botox'] },
          { name: '엘러간 주름 1부위', orig: 75000, event: 39000, tags: ['botox'] },
          { name: '엘러간 사각턱', orig: 260000, event: 149000, tags: ['botox'] },
        ],
      },
      {
        name: '필러', sort_order: 2,
        items: [
          { name: '턱끝 필러', orig: 96000, event: 49000, tags: ['filler'] },
          { name: '입술 필러', orig: 170000, event: 89000, tags: ['filler'] },
          { name: '동안필러', orig: 180000, event: 99000, tags: ['filler'] },
        ],
      },
      {
        name: '리프팅', sort_order: 3,
        items: [
          { name: '슈링크 100샷', orig: 28000, event: 15000, tags: ['lifting'], is_popular: true },
          { name: '인모드FX 1부위', orig: 17000, event: 9000, tags: ['lifting'] },
          { name: '온다 60KJ', orig: 580000, event: 299000, tags: ['lifting'] },
          { name: '울쎄라프라임 300샷', orig: 1700000, event: 890000, tags: ['lifting'] },
          { name: '써마지FLX 300샷', orig: 1650000, event: 890000, tags: ['lifting'] },
        ],
      },
      {
        name: '스킨부스터', sort_order: 4,
        items: [
          { name: '콜라스터', orig: 49000, event: 29000, tags: ['skinbooster'] },
          { name: '쥬베룩스킨 1cc', orig: 55000, event: 29000, tags: ['skinbooster'], is_popular: true },
          { name: '리쥬란힐러 2cc', orig: 250000, event: 135000, tags: ['skinbooster'] },
          { name: '릴리이드 2cc', orig: 120000, event: 69000, tags: ['skinbooster'] },
        ],
      },
      {
        name: '제모', sort_order: 5,
        items: [
          { name: '여성 인중', orig: 1700, event: 900, tags: ['hair_removal'] },
          { name: '여성 겨드랑이', orig: 1700, event: 900, tags: ['hair_removal'] },
          { name: '남성 인중+콧수염', orig: 1900, event: 1000, tags: ['hair_removal'] },
        ],
      },
      {
        name: '바디', sort_order: 6,
        items: [
          { name: '제로팻주사 팔뚝', orig: 38000, event: 19000, tags: ['body'] },
          { name: '바디인모드FX 1부위', orig: 28000, event: 15000, tags: ['body'] },
        ],
      },
    ]
  );
  console.log('  ✓ 병원: 밴스의원 성수점\n');

  // ────────────────────────────────────────────────
  // 2. 유앤아이 왕십리점 (wsnuni114.co.kr) — 부분 데이터
  // ────────────────────────────────────────────────
  await insertClinic(
    { id: 'uni_wangsimni', name: '유앤아이 왕십리점', district_id: 'seongdong', address: '서울 성동구 왕십리', phone: '' },
    [
      {
        name: '보톡스', sort_order: 0,
        items: [
          { name: '국산 보톡스 주름 1부위', orig: 60000, event: 35000, tags: ['botox'], is_popular: true },
        ],
      },
      {
        name: '필러', sort_order: 1,
        items: [
          { name: '벨로테로 1cc', orig: 680000, event: 350000, tags: ['filler'] },
        ],
      },
      {
        name: '리프팅', sort_order: 2,
        items: [
          { name: '울쎄라프라임 300샷', orig: 1900000, event: 1100000, tags: ['lifting'] },
          { name: '써마지 300샷', orig: 1800000, event: 990000, tags: ['lifting'] },
        ],
      },
      {
        name: '스킨케어', sort_order: 3,
        items: [
          { name: '아쿠아필', orig: 70000, event: 50000, tags: ['skincare'] },
        ],
      },
      {
        name: '제모', sort_order: 4,
        items: [
          { name: '여성 겨드랑이', orig: 19000, event: 10000, tags: ['hair_removal'] },
        ],
      },
    ]
  );
  console.log('  ✓ 병원: 유앤아이 왕십리점 (부분 데이터 — JS SPA 제한)\n');

  // ────────────────────────────────────────────────
  // 3. 밴스의원 왕십리점 NEW (wangsimni.vandsclinic.co.kr)
  // ────────────────────────────────────────────────
  await insertClinic(
    { id: 'vands_wangsimni', name: '밴스의원 왕십리점', district_id: 'seongdong', address: '서울 성동구 왕십리', phone: '' },
    [
      {
        name: '보톡스', sort_order: 0,
        items: [
          { name: '국산 주름 1부위', orig: 1500, event: 800, tags: ['botox'], is_popular: true },
          { name: '국산 사각턱', orig: 8500, event: 4900, tags: ['botox'], is_popular: true },
          { name: '내성적은 독일산 주름 1부위', orig: 55000, event: 29000, tags: ['botox'] },
          { name: '엘러간 주름 1부위', orig: 75000, event: 39000, tags: ['botox'] },
          { name: '엘러간 사각턱', orig: 260000, event: 149000, tags: ['botox'] },
        ],
      },
      {
        name: '필러', sort_order: 1,
        items: [
          { name: '아띠에르 1cc', orig: 80000, event: 43000, tags: ['filler'] },
          { name: '벨로테로/레스틸렌 1cc', orig: 330000, event: 170000, tags: ['filler'] },
        ],
      },
      {
        name: '리프팅', sort_order: 2,
        items: [
          { name: '인모드FX 1부위', orig: 11000, event: 6000, tags: ['lifting'] },
          { name: '슈링크 100샷', orig: 23000, event: 13000, tags: ['lifting'], is_popular: true },
          { name: '슈링크 600샷', orig: 290000, event: 150000, tags: ['lifting'] },
          { name: '올리지오 100샷', orig: 185000, event: 99000, tags: ['lifting'] },
          { name: '울쎄라프라임 100샷', orig: 550000, event: 289000, tags: ['lifting'] },
        ],
      },
      {
        name: '스킨부스터', sort_order: 3,
        items: [
          { name: '리쥬란힐러 2cc', orig: 250000, event: 135000, tags: ['skinbooster'] },
          { name: '아이리쥬란 1cc', orig: 185000, event: 99000, tags: ['skinbooster'] },
        ],
      },
      {
        name: '제모', sort_order: 4,
        items: [
          { name: '여성 인중', orig: 800, event: 500, tags: ['hair_removal'] },
          { name: '여성 겨드랑이', orig: 800, event: 500, tags: ['hair_removal'] },
          { name: '남성 인중', orig: 1800, event: 1000, tags: ['hair_removal'] },
        ],
      },
      {
        name: '스킨케어', sort_order: 5,
        items: [
          { name: '아쿠아필 2단계', orig: 8000, event: 4500, tags: ['skincare'] },
          { name: 'LDM 얼굴전체', orig: 48000, event: 25000, tags: ['skincare'] },
        ],
      },
      {
        name: '바디', sort_order: 6,
        items: [
          { name: '제로팻주사 팔뚝', orig: 38000, event: 19000, tags: ['body'] },
          { name: '바디인모드FX 1부위', orig: 28000, event: 15000, tags: ['body'] },
        ],
      },
      {
        name: '이달의 이벤트', sort_order: 7,
        items: [
          { name: '써마지FLX300+울쎄라300+사각턱보톡스', orig: 5400000, event: 2750000, tags: ['lifting'], is_popular: true },
          { name: '울쎄라프라임 300샷', orig: 1700000, event: 890000, tags: ['lifting'] },
          { name: '써마지FLX 300샷', orig: 1650000, event: 890000, tags: ['lifting'] },
        ],
      },
    ]
  );
  console.log('  ✓ 병원: 밴스의원 왕십리점 (NEW)\n');

  console.log('=== 성동구 재시드 완료! ===');
  console.log('성동구 총 병원: 3개');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
