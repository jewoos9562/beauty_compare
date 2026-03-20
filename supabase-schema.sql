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
