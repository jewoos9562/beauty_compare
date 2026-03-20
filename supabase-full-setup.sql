-- =============================================
-- 서울 피부과 가격 비교 - Supabase 스키마
-- =============================================

-- 1. 지역구
CREATE TABLE districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT false
);

-- 2. 병원
CREATE TABLE clinics (
  id TEXT PRIMARY KEY,
  district_id TEXT NOT NULL REFERENCES districts(id),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  note TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 카테고리 (이벤트/첫방문/일반 등)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tag TEXT,
  sort_order INT DEFAULT 0,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 시술 항목
CREATE TABLE treatments (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  orig_price INT,
  event_price INT,
  base_price INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 교차비교 키워드
CREATE TABLE cross_keywords (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  keywords TEXT[] NOT NULL
);

-- 6. 크롤링 로그
CREATE TABLE crawl_logs (
  id SERIAL PRIMARY KEY,
  clinic_id TEXT REFERENCES clinics(id),
  status TEXT NOT NULL DEFAULT 'success',
  items_count INT DEFAULT 0,
  error_message TEXT,
  crawled_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_clinics_district ON clinics(district_id);
CREATE INDEX idx_categories_clinic ON categories(clinic_id);
CREATE INDEX idx_treatments_category ON treatments(category_id);
CREATE INDEX idx_categories_tag ON categories(tag);
CREATE INDEX idx_crawl_logs_clinic ON crawl_logs(clinic_id);
CREATE INDEX idx_crawl_logs_time ON crawl_logs(crawled_at);

-- =============================================
-- RLS (Row Level Security) - 읽기 허용
-- =============================================
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- anon 사용자에게 읽기 허용
CREATE POLICY "Allow public read" ON districts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON clinics FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON treatments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON cross_keywords FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON crawl_logs FOR SELECT USING (true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clinics_updated
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_treatments_updated
  BEFORE UPDATE ON treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO districts (id, name, active) VALUES ('gwangjin', '광진구', true) ON CONFLICT (id) DO NOTHING;

INSERT INTO clinics (id, district_id, name, address, phone, note, color) VALUES ('toxnfill', 'gwangjin', '톡스앤필 건대점', '서울 광진구 건대입구', '02-6235-1567', 'VAT 10% 별도 | 카카오톡 채널 추가 + 홈페이지 예약/내원 고객 기준', 'from-violet-600 to-violet-400') ON CONFLICT (id) DO NOTHING;
INSERT INTO clinics (id, district_id, name, address, phone, note, color) VALUES ('uni', 'gwangjin', '유앤아이 건대점', '서울 광진구 아차산로 219, 2층', '02-2039-3459', '이벤트기간 2026.03.01~03.31 | VAT 별도', 'from-emerald-600 to-emerald-400') ON CONFLICT (id) DO NOTHING;
INSERT INTO clinics (id, district_id, name, address, phone, note, color) VALUES ('dayview', 'gwangjin', '데이뷰 건대입구역점', '서울 광진구 동일로20길 106, 1·2층', '02-465-7791', 'VAT 별도 | 카톡플친 적용가 | 1인 2가지 시술 가능(첫방문)', 'from-orange-500 to-orange-300') ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  cat_id INT;
BEGIN
  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '첫방문 행복 EVENT', 'first', 0) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱보톡스 50U (국산) 1회', 19500, 9900, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '주름보톡스 2부위 1회', 19500, 9900, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '윤곽주사 1부위 1회', 19500, 9900, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '루카스 토닝 1회', 19500, 9900, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '아쿠아필 1회', 28000, 14900, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드FX (4분) 1회', 97000, 49000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 유니버스 울트라F 300샷', 97000, 49000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 힐러 2cc', 250000, 139000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '포텐자 펌핑팁+쥬베룩 2cc', 350000, 199000, NULL, 8);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 100샷', 490000, 299000, NULL, 9);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '3월 스킨부스팅 (3/1~3/31)', 'event', 1) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '아쿠아필+모델링', 50000, 29000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '이마+미간톡신(국산)', 75000, 39000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '이마+미간톡신(코어톡스)', 110000, 69000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '저통증 스킨톡신(제오민)', 400000, 280000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬하이 4cc+아이리쥬하이 2cc', 600000, 399000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨바이브 1cc+1cc', 680000, 349000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬베룩 1cc', 80000, 49500, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '레티젠 2cc', 550000, 289000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '포텐자 펌핑팁+쥬베룩 4cc', 490000, 320000, NULL, 8);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '3월 리프팅 (3/1~3/31)', 'event', 2) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 300샷', 1390000, 990000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '페이스온다 4만줄', 490000, 250000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리프테라2 3,000샷', 129000, 89000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 유니버스 300샷', 200000, 129000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '써마지 600샷+LDM트리플', 2600000, 1890000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼뉴머 300샷', 480000, 350000, NULL, 5);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '차세대 스킨부스터 (2/15~3/31)', 'new', 3) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리투오 라이트 1vial', 600000, 350000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리투오 라이트 1+1vial', 1100000, 600000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리투오 1vial', 1150000, 660000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬브아셀 3% 1시린지', 750000, 390000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬브아셀 8% 1시린지', 1150000, 590000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '고우리 1시린지', 970000, 549000, NULL, 5);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '원데이 맞춤 패키지 (3/1~3/31)', 'event', 4) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '[스킨케어] 아쿠아필+LDM+모델링', 150000, 99000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '[V라인] 울쎄라피300+온다3만+톡신', 1900000, 1290000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '[V라인] 온다5만줄+윤곽주사2부위', 550000, 299000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '[스킨부스팅] 리쥬하이4cc+쥬베룩2cc+LDM', 800000, 419000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '[스킨부스팅] 써마지300+스킨톡신+리쥬하이4cc', 2500000, 1490000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '[스킨부스팅] 볼뉴머600+스킨톡신(국산)', 1200000, 750000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '[프리미엄] 울쎄라피+써마지+리쥬하이+LDM+백옥', 3900000, 2890000, NULL, 6);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '화수목 해피아워 (10:30~16:30)', 'weekday', 5) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코슈어 토닝+시트팩', 95000, 49000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱끝 필러 1cc(국산)', 115000, 59000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬베룩 스킨부스터 2cc', 120000, 99000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨바이브 1cc', 310000, 159000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '페이스온다 3만줄+슈링크F 300샷', 430000, 219000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '레티젠 2cc', 580000, 299000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '점 제거 ~60개', 500000, 309000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란HB 4cc', 720000, 399000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '페이스온다 8만줄', 900000, 459000, NULL, 8);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '건대점 BEST', 'best', 6) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱보톡스 50U(국산)', 35000, 29000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '라라필', 89000, 59000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '이마+미간보톡스(독일산)', 160000, 99000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '엑셀V플러스(제네시스)', 150000, 100000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리프테라2 3000샷', 129000, 100000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '더모톡신(국산)', 260000, 190000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 힐러 2cc', 300000, 250000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬베룩(스킨) 1vial', 450000, 350000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 울트라F 300샷', 319000, 160000, NULL, 8);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '포텐자800+쥬베룩4cc', 550000, 450000, NULL, 9);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '체험온다 80000J', 990000, 499000, NULL, 10);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 300샷', 1390000, 1090000, NULL, 11);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '써마지FLX 600샷', 2490000, 1980000, NULL, 12);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피+써마지+LDM', 3880000, 2800000, NULL, 13);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '레이저 리프팅', 'event', 7) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피300+써마지600+LDM', 3880000, 2800000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '써마지FLX 300샷', 1490000, 1090000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '써마지FLX 600샷', 2490000, 1980000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼뉴머 600샷', 870000, 690000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼뉴머 1000샷', 1300000, 1000000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '아이울쎄라피 100샷', 600000, 450000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 울트라F 100샷', 119000, 60000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 울트라F 600샷', 519000, 260000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 울트라F 1000샷', 759000, 380000, NULL, 8);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '튠페이스+LDM 1회', 1000000, 790000, NULL, 9);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '체험가 이벤트', 'hot', 8) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '튠바디 20분 체험', 400000, 270000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '벨라콜린 1vial 체험', 350000, 250000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '포텐자 600샷 체험', 290000, 200000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '튠페이스 60KJ x2회', 1990000, 1000000, NULL, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '디자인 인모드', 'event', 9) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX(8분)', 160000, 129000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FORMA(8K)', 140000, 119000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX+FORMA', 280000, 230000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, 'FX+FORMA 3회권', 800000, 600000, NULL, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '체형관리', 'body', 10) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '프라임 바디컷 500cc', 1600000, 890000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '프라임 바디컷 500ccx3', 4200000, 2250000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '빼빼주사 3cc', 69000, 49000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '바디보톡스 100U', 157000, 89000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '발레리나핏 100cc', 250000, 190000, NULL, 4);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '남성 이벤트', 'male', 11) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '브라질리언 제모', 150000, 120000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '훈남제모 얼굴아래', 110000, 90000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱보톡스+침샘+윤곽주사', 165000, 109000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '맨즈 스피드케어', 110000, 80000, NULL, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '일반 - 톡신', NULL, 12) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '사각턱톡신', NULL, NULL, 29000, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '주름톡신', NULL, NULL, 19000, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨톡신', NULL, NULL, 190000, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱라인리프팅톡신', NULL, NULL, 79000, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '일반 - 필러', NULL, 13) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼륨 필러', NULL, NULL, 150000, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱필러', NULL, NULL, 150000, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '코 필러', NULL, NULL, 250000, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '눈밑고랑 필러', NULL, NULL, 350000, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '입술 필러', NULL, NULL, 180000, 4);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '일반 - 스킨부스터', NULL, 14) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란힐러', NULL, NULL, 250000, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란아이', NULL, NULL, 120000, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬베룩', NULL, NULL, 350000, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨바이브', NULL, NULL, 350000, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '물광주사', NULL, NULL, 150000, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '레티젠', NULL, NULL, 399000, 5);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('toxnfill', '일반 - 영양주사', NULL, 15) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '백옥주사', NULL, NULL, 55000, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '신데렐라주사', NULL, NULL, 40000, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '마늘주사', NULL, NULL, 50000, 2);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '입고 이벤트', 'new', 0) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '포텐자펌핑+방탄주사(플라비셀) 1회', 400000, 220000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '포텐자펌핑+방탄주사 3회', 1000000, 590000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '레티젠 아이 1cc', 550000, 300000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '레티젠 아이 1cc 3회', 1650000, 850000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '브이올렛(지방세포파괴) 1바이알', 350000, 200000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬베룩 볼륨 1바이알', 1000000, 550000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬베룩 볼륨 3바이알', 2800000, 1500000, NULL, 6);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '이달의 단독이벤트', 'event', 1) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 100샷', 400000, 290000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '화이트닝 올인원 5회', 1075000, 690000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '화이트닝 올인원 10회', 2150000, 1190000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '홍조 삭제패키지 5회', 1400000, 490000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '홍조 삭제패키지 10회', 2800000, 890000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울트라콜 100 2cc', 200000, 99000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '하이코', 290000, 250000, NULL, 6);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '첫방문 체험가', 'first', 2) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX 얼굴전체 체험', 120000, 65000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '아이슈링크 100샷 체험', 90000, 59000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '바디 인모드 1부위 체험', 90000, 50000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '승모근/종아리 톡신 100U 체험', 64000, 33000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코토닝/노블린 1회 체험', 68000, 35000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '듀얼토닝+비타민관리 체험', 154000, 79000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '릴리이드 물광주사 2.5cc 체험', 180000, 65000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코프락셀 나비존 체험', 110000, 58000, NULL, 7);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '화수목 이벤트', 'weekday', 3) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코토닝 3회', 180000, 100000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크유니버스 600샷', 250000, 140000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '올인원부스터(리쥬란2cc+쥬베룩2cc+릴리이드2.5cc)', 847000, 400000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '목주름지우개(벨로테로+스킨톡신+연어주사)', 560000, 290000, NULL, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '레이저리프팅', NULL, 4) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 300샷', 2000000, 1050000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 600샷', 3800000, 1950000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX 얼굴전체', 150000, 79000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FORMA 얼굴전체', 150000, 79000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX+FORMA 1회', 230000, 120000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX+FORMA 3회', 640000, 330000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 유니버스 300샷', 140000, 79000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 유니버스 300샷 3회', 410000, 210000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '텐써마 300샷', 1200000, 650000, NULL, 8);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '텐써마 600샷', 2300000, 1190000, NULL, 9);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '실리프팅', NULL, 5) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '잼버실 1줄', 150000, 79000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '잼버실 10줄', 1400000, 750000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '하이코', 450000, 250000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '콘셀티나 8줄', 2100000, 1100000, NULL, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '보톡스/윤곽', NULL, 6) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '주름톡신 1부위(독일산)', 70000, 45000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '주름톡신 2부위(독일산)', 130000, 85000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱 톡신(독일산)', 150000, 85000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨톡신 얼굴전체(독일산)', 290000, 150000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '겨드랑이 다한증 100U(독일산)', 400000, 220000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '이중턱 뿌셔주사', 250000, 130000, NULL, 5);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '필러', NULL, 7) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '국산 필러 1cc(유스필)', 160000, 85000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '아말리안 필러 1cc', 350000, 180000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '벨로테로 필러 1cc', 490000, 250000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬비덤 필러 1cc', 490000, 250000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '레스틸렌 필러 1cc', 520000, 270000, NULL, 4);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '기미/잡티/홍조', NULL, 8) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '듀얼토닝(레이저+제네시스) 1회', 150000, 79000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '듀얼토닝 10회', 1100000, 600000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코토닝/노블린 10회', 1000000, 550000, NULL, 2);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '스킨부스터', NULL, 9) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 HB PLUS 2cc', 680000, 349000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 힐러2cc+스킨톡신', 430000, 220000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 힐러2cc+쥬베룩2cc', 760000, 390000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 원데이(힐러2cc+아이1cc)', 550000, 290000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '쥬베룩 스킨 2cc', 350000, 180000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '콜라겐주사(레티젠) 2cc', 880000, 450000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '콜라겐주사(레티젠) 6cc', 2300000, 1190000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '레디어스 1시린지', 1500000, 790000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨바이브 1cc', 330000, 170000, NULL, 8);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨바이브 2cc', 560000, 290000, NULL, 9);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '물광주사(릴리이드) 2.5cc', 150000, 79000, NULL, 10);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '광채주사 2cc', 120000, 65000, NULL, 11);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '여드름/모공', NULL, 10) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코프락셀 나비존', 170000, 89000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코프락셀 전체+크라이오 5회', 960000, 490000, NULL, 1);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '스킨케어', NULL, 11) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '밀크필 1회', 98000, 50000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '라라필 1회', 80000, 60000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '이온자임 1회', 70000, 50000, NULL, 2);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('uni', '다이어트', 'body', 12) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, 'HPL 4회+노블쉐이프 4회', 640000, 330000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '아쎄라 바디 1회', 290000, 150000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '지방분해(복부/허벅지) 1회', 430000, 220000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '바디톡신 100U(독일산)', 300000, 180000, NULL, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '첫방문 이벤트 (상시)', 'first', 0) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱보톡스 50U', 17000, 9900, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '주름보톡스 1부위(국산)', 1900, 1000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '얼굴전체 스킨보톡스', 95000, 49000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '지방용해주사 2cc', 1900, 1000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '점제거 1mm(최대3)', 900, 500, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 1부위', 55000, 29000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 300샷', 110000, 69000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼뉴머 고주파리프팅', 590000, 299000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '포토나 토닝', 55000, 29000, NULL, 8);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코토닝', 66000, 39000, NULL, 9);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '카프리 레이저', 77000, 39000, NULL, 10);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '듀얼토닝(기미+탄력)', 80000, 49000, NULL, 11);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '모공청소 아쿠아필', 15000, 9900, NULL, 12);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '라라필', 17000, 9000, NULL, 13);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '물광 케어', 95000, 49000, NULL, 14);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 아이 1cc', 190000, 99000, NULL, 15);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란 2cc', 370000, 190000, NULL, 16);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '여성 젠틀맥스 제모', 9900, 5000, NULL, 17);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '남성 젠틀맥스 제모', 9900, 5000, NULL, 18);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '쁘띠시술 (상시)', 'event', 1) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '턱 톡신 50U', 9900, 5000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스킨톡신 1부위', 29000, 15000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '얼굴 지방파괴주사 5cc', 29000, 15000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '바디톡신 100U', 25000, 15000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '입술/턱끝 필러 1cc', 109000, 69000, NULL, 4);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '프리미엄 리프팅 (상시)', 'event', 2) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '엠페이스 1회', 1925000, 1275000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '엠페이스 3회', 5505000, 3375000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '써마지FLX 눈가225샷', 1390000, 1000000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '써마지FLX 300샷', 1690000, 1090000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '써마지FLX 600샷', 2490000, 1990000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '온다 브이라인', 550000, 450000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '온다 이중턱', 650000, 550000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '온다 얼굴전체', 790000, 690000, NULL, 7);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '온다 60KJ 6회 정기권', 4500000, 2320000, NULL, 8);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 아이 100샷', 650000, 550000, NULL, 9);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 100샷', 650000, 550000, NULL, 10);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 300샷', 1800000, 1350000, NULL, 11);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '울쎄라피 프라임 600샷', 3300000, 2400000, NULL, 12);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼뉴머 아이 100샷', 200000, 150000, NULL, 13);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼뉴머 300샷', 550000, 430000, NULL, 14);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '볼뉴머 600샷', 1100000, 690000, NULL, 15);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX 5분(부분)', 160000, 110000, NULL, 16);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX 10분(전체)', 320000, 189000, NULL, 17);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX 10분 3회', 960000, 490000, NULL, 18);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX+Forma 하프 1회', 299000, 158000, NULL, 19);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '인모드 FX+Forma 풀 1회', 490000, 310000, NULL, 20);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 울트라 100샷', 109000, 69000, NULL, 21);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 울트라 300샷', 327000, 169000, NULL, 22);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 울트라 300샷 3회', 880000, 450000, NULL, 23);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '슈링크 부스터 300샷', 345000, 210000, NULL, 24);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '스킨부스터 (상시)', 'event', 3) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란힐러 2cc', 250000, 159000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '리쥬란HB 1cc', 229000, 119000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '프리미엄 콜라겐주사 2cc', 115000, 59000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '수분폭탄 릴리이드M 2.5cc', 59000, 39000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '유산균 엑소좀 디하이브 2cc', 79000, 49000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피부개선 웰스톡스 3cc', 159000, 119000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '세포 엑소좀 도노셀 2cc', 59000, 39000, NULL, 6);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '색소/홍조 (상시)', 'event', 4) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '헬리오스3토닝+시트팩 1회', 59000, 49000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '헬리오스3토닝+모델링 10회', 590000, 396900, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코슈어토닝+시트팩 1회', 100000, 79000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코슈어토닝+모델링 5회', 500000, 375000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '제네시스토닝+모델링 10회', 1000000, 639900, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피코슈어 줌패스 3회', 420000, 250000, NULL, 5);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '점제거(소) 1개', 15000, 10000, NULL, 6);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '점제거 얼굴전체 60개', 700000, 450000, NULL, 7);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '트러블 (상시)', 'event', 5) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피지선박멸 트러블관리 1회', 179000, 125300, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '피지선박멸 트러블관리 5회', 895000, 550000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '에토좀 PTT+재생LED+토닝 1회', 190000, 133000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '프리미엄 압출 1회', 70000, 50000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '염증주사 1개', NULL, 10000, NULL, 4);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '여드름 약처방 2주', NULL, 10000, NULL, 5);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '스킨케어 (상시)', 'event', 6) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '모공청소 아쿠아필', 15000, 9900, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '스피드 라라필', 19000, 9900, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '각질순삭 GA필', 16000, 9900, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '우유광채 밀크필', 18000, 9900, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '속건조개선 LDM', 20000, 12900, NULL, 4);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '제모 - 젠틀맥스프로플러스', NULL, 7) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '남성 얼굴아래 1회', 150000, 130000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '남성 인중+턱끝 5회', 493500, 430000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '여성 인중 1회', 40000, 24000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '여성 겨드랑이 1회', 40000, 23000, NULL, 3);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '여성 브라질리언 5회', 546000, 385000, NULL, 4);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '문신제거', NULL, 8) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '눈썹문신 1회', 200000, 170000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '눈썹문신 5회', 1000000, 850000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '명함크기 1회', 300000, 255000, NULL, 2);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '명함크기 5회', 1500000, 1275000, NULL, 3);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '다이어트', 'body', 9) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '바디 지방파괴주사 50cc', 69000, 60000, NULL, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '바디 지방파괴주사 100cc', 130000, 110000, NULL, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '다이어트 약처방 2주', NULL, 10000, NULL, 2);

  INSERT INTO categories (clinic_id, name, tag, sort_order) VALUES ('dayview', '영양주사', NULL, 10) RETURNING id INTO cat_id;
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '영양수액(백옥/항산화/마늘 택1)', NULL, NULL, 30000, 0);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '영양수액 10회', NULL, NULL, 290000, 1);
  INSERT INTO treatments (category_id, name, orig_price, event_price, base_price, sort_order) VALUES (cat_id, '태반주사 1회', NULL, NULL, 40000, 2);

END $$;

-- Cross comparison keywords
INSERT INTO cross_keywords (label, keywords) VALUES ('울쎄라피 프라임 300샷', ARRAY['울쎄라피 프라임 300샷','울쎄라피 300']);
INSERT INTO cross_keywords (label, keywords) VALUES ('울쎄라피 프라임 100샷', ARRAY['울쎄라피 프라임 100샷','울쎄라피 100']);
INSERT INTO cross_keywords (label, keywords) VALUES ('써마지FLX 600샷', ARRAY['써마지flx 600','써마지 600','써마지fx 600']);
INSERT INTO cross_keywords (label, keywords) VALUES ('슈링크 300샷', ARRAY['슈링크 300','슈링크 유니버스 300','울트라f 300','울트라 300']);
INSERT INTO cross_keywords (label, keywords) VALUES ('볼뉴머 300샷', ARRAY['볼뉴머 300']);
INSERT INTO cross_keywords (label, keywords) VALUES ('볼뉴머 600샷', ARRAY['볼뉴머 600']);
INSERT INTO cross_keywords (label, keywords) VALUES ('인모드 FX+FORMA', ARRAY['인모드 fx+forma','fx+forma 풀','fx + forma']);
INSERT INTO cross_keywords (label, keywords) VALUES ('인모드 FX', ARRAY['인모드 fx','인모드fx']);
INSERT INTO cross_keywords (label, keywords) VALUES ('리쥬란 힐러 2cc', ARRAY['리쥬란 힐러 2cc','리쥬란힐러 2cc','리쥬란 2cc']);
INSERT INTO cross_keywords (label, keywords) VALUES ('쥬베룩 스킨 2cc', ARRAY['쥬베룩 스킨 2cc','쥬베룩 스킨부스터 2cc']);
INSERT INTO cross_keywords (label, keywords) VALUES ('스킨바이브 1cc', ARRAY['스킨바이브 1cc']);
INSERT INTO cross_keywords (label, keywords) VALUES ('레티젠 2cc', ARRAY['레티젠 2cc','콜라겐주사(레티젠) 2cc']);
INSERT INTO cross_keywords (label, keywords) VALUES ('온다 리프팅', ARRAY['온다 얼굴','페이스온다','온다 리프팅']);
INSERT INTO cross_keywords (label, keywords) VALUES ('턱보톡스 50U', ARRAY['턱보톡스 50','턱 톡신 50','턱톡신']);
INSERT INTO cross_keywords (label, keywords) VALUES ('스킨톡신 얼굴전체', ARRAY['스킨톡신 얼굴','스킨보톡스 얼굴','더모톡신','스킨톡신']);
INSERT INTO cross_keywords (label, keywords) VALUES ('물광주사', ARRAY['물광주사','릴리이드','물광 케어','수분폭탄']);
INSERT INTO cross_keywords (label, keywords) VALUES ('피코토닝', ARRAY['피코토닝','피코슈어 토닝','피코슈어토닝']);
INSERT INTO cross_keywords (label, keywords) VALUES ('아쿠아필', ARRAY['아쿠아필']);
INSERT INTO cross_keywords (label, keywords) VALUES ('라라필', ARRAY['라라필']);
INSERT INTO cross_keywords (label, keywords) VALUES ('포텐자', ARRAY['포텐자']);
INSERT INTO cross_keywords (label, keywords) VALUES ('점 제거', ARRAY['점 제거','점제거']);
