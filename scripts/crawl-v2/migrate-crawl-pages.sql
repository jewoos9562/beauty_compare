-- raw text 저장 테이블
CREATE TABLE IF NOT EXISTS crawl_pages (
  id SERIAL PRIMARY KEY,
  hira_id TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  url TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  char_count INTEGER NOT NULL DEFAULT 0,
  crawled_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_pages_hira ON crawl_pages(hira_id);

ALTER TABLE crawl_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read crawl_pages" ON crawl_pages FOR SELECT USING (true);
CREATE POLICY "Public insert crawl_pages" ON crawl_pages FOR INSERT WITH CHECK (true);

-- crawl_images에 ocr_text 컬럼 추가 (OCR 결과 저장용)
ALTER TABLE crawl_images
  ADD COLUMN IF NOT EXISTS ocr_text TEXT;
