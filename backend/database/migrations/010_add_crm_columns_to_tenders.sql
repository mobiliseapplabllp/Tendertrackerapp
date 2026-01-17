-- Migration: Add CRM columns to tenders table (before rename)
-- Date: 2025-01-27
-- Description: Add CRM-specific columns to tenders table to support new features
-- This should be run BEFORE 007_rename_tenders_to_leads.sql

-- UP
-- Add lead_type_id column (if it doesn't exist)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND COLUMN_NAME = 'lead_type_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenders ADD COLUMN lead_type_id INT NULL AFTER category_id',
  'SELECT "Column lead_type_id already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for lead_type_id (if it doesn't exist)
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND INDEX_NAME = 'idx_lead_type'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE tenders ADD INDEX idx_lead_type (lead_type_id)',
  'SELECT "Index idx_lead_type already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for lead_type_id (if it doesn't exist)
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND CONSTRAINT_NAME = 'fk_tenders_lead_type'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE tenders ADD CONSTRAINT fk_tenders_lead_type FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE SET NULL',
  'SELECT "Foreign key fk_tenders_lead_type already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add sales_stage_id column (if it doesn't exist)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND COLUMN_NAME = 'sales_stage_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenders ADD COLUMN sales_stage_id INT NULL AFTER lead_type_id',
  'SELECT "Column sales_stage_id already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for sales_stage_id (if it doesn't exist)
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND INDEX_NAME = 'idx_sales_stage'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE tenders ADD INDEX idx_sales_stage (sales_stage_id)',
  'SELECT "Index idx_sales_stage already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for sales_stage_id (if it doesn't exist)
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND CONSTRAINT_NAME = 'fk_tenders_sales_stage'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE tenders ADD CONSTRAINT fk_tenders_sales_stage FOREIGN KEY (sales_stage_id) REFERENCES sales_stages(id) ON DELETE SET NULL',
  'SELECT "Foreign key fk_tenders_sales_stage already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add deal_value column (if it doesn't exist)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND COLUMN_NAME = 'deal_value'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenders ADD COLUMN deal_value DECIMAL(15, 2) NULL AFTER estimated_value',
  'SELECT "Column deal_value already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add probability column (if it doesn't exist)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND COLUMN_NAME = 'probability'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenders ADD COLUMN probability INT DEFAULT 0 COMMENT ''Win probability percentage (0-100)'' AFTER deal_value',
  'SELECT "Column probability already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add expected_close_date column (if it doesn't exist)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND COLUMN_NAME = 'expected_close_date'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenders ADD COLUMN expected_close_date DATE NULL AFTER expected_award_date',
  'SELECT "Column expected_close_date already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for expected_close_date (if it doesn't exist)
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND INDEX_NAME = 'idx_expected_close'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE tenders ADD INDEX idx_expected_close (expected_close_date)',
  'SELECT "Index idx_expected_close already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add source column (if it doesn't exist)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND COLUMN_NAME = 'source'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenders ADD COLUMN source VARCHAR(100) NULL COMMENT ''Lead source: Web, Referral, Cold Call, etc.'' AFTER expected_close_date',
  'SELECT "Column source already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for source (if it doesn't exist)
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND INDEX_NAME = 'idx_source'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE tenders ADD INDEX idx_source (source)',
  'SELECT "Index idx_source already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add converted_from column (if it doesn't exist)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenders'
  AND COLUMN_NAME = 'converted_from'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tenders ADD COLUMN converted_from INT NULL COMMENT ''Original lead ID if converted'' AFTER source',
  'SELECT "Column converted_from already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Set default lead type for existing records (Tender)
UPDATE tenders 
SET lead_type_id = (SELECT id FROM lead_types WHERE name = 'Tender' LIMIT 1) 
WHERE lead_type_id IS NULL;

-- Set default sales stage for existing records (New)
UPDATE tenders 
SET sales_stage_id = (SELECT id FROM sales_stages WHERE name = 'New' LIMIT 1) 
WHERE sales_stage_id IS NULL;

-- Copy estimated_value to deal_value for existing records
UPDATE tenders 
SET deal_value = estimated_value 
WHERE deal_value IS NULL AND estimated_value IS NOT NULL;

-- DOWN
-- Remove columns (in reverse order)
ALTER TABLE tenders
DROP FOREIGN KEY IF EXISTS fk_tenders_sales_stage,
DROP INDEX IF EXISTS idx_sales_stage,
DROP COLUMN IF EXISTS sales_stage_id;

ALTER TABLE tenders
DROP FOREIGN KEY IF EXISTS fk_tenders_lead_type,
DROP INDEX IF EXISTS idx_lead_type,
DROP COLUMN IF EXISTS lead_type_id;

ALTER TABLE tenders
DROP INDEX IF EXISTS idx_expected_close,
DROP COLUMN IF EXISTS expected_close_date;

ALTER TABLE tenders
DROP INDEX IF EXISTS idx_source,
DROP COLUMN IF EXISTS source;

ALTER TABLE tenders
DROP COLUMN IF EXISTS converted_from;

ALTER TABLE tenders
DROP COLUMN IF EXISTS probability;

ALTER TABLE tenders
DROP COLUMN IF EXISTS deal_value;

