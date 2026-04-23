-- Add review workflow columns to crawl_images
ALTER TABLE crawl_images
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tag TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Index for fast filtering by status
CREATE INDEX IF NOT EXISTS idx_crawl_images_status ON crawl_images(status);
CREATE INDEX IF NOT EXISTS idx_crawl_images_hira ON crawl_images(hira_id);
CREATE INDEX IF NOT EXISTS idx_crawl_images_primary ON crawl_images(hira_id, is_primary) WHERE is_primary = true;

-- Allow public update (for admin UI without auth — add auth later)
CREATE POLICY "Public update crawl_images" ON crawl_images FOR UPDATE USING (true);
