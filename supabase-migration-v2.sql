-- =============================================
-- Migration v2: treatments 테이블에 새 컬럼 추가
-- =============================================

ALTER TABLE treatments ADD COLUMN IF NOT EXISTS volume_or_count TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS master_sub TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS master_treatment TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS promo TEXT;
