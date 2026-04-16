-- 크롤링 가격 데이터 (HIRA ID 기반)
CREATE TABLE IF NOT EXISTS crawl_treatments (
  id SERIAL PRIMARY KEY,
  hira_id TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  treatment_name TEXT NOT NULL,
  standard_name TEXT,
  orig_price INTEGER,
  event_price INTEGER,
  volume_or_count TEXT,
  area TEXT,
  notes TEXT,
  source_url TEXT,
  crawled_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_treatments_hira ON crawl_treatments(hira_id);

ALTER TABLE crawl_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read crawl_treatments" ON crawl_treatments FOR SELECT USING (true);

-- 크롤 로그
CREATE TABLE IF NOT EXISTS crawl_logs_v2 (
  id SERIAL PRIMARY KEY,
  hira_id TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  homepage_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pages_crawled INTEGER DEFAULT 0,
  treatments_found INTEGER DEFAULT 0,
  error_message TEXT,
  crawled_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crawl_logs_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read crawl_logs_v2" ON crawl_logs_v2 FOR SELECT USING (true);
