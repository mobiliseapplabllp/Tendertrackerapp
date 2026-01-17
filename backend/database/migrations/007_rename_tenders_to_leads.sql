-- Migration: Rename tenders to leads and add CRM fields
-- Date: 2025-01-27
-- Description: Transform tenders table to leads with CRM enhancements

-- UP
-- Step 1: Add new CRM columns to tenders table
ALTER TABLE tenders
ADD COLUMN lead_type_id INT NULL AFTER category_id,
ADD COLUMN sales_stage_id INT NULL AFTER lead_type_id,
ADD COLUMN deal_value DECIMAL(15, 2) NULL AFTER estimated_value,
ADD COLUMN probability INT DEFAULT 0 COMMENT 'Win probability percentage (0-100)' AFTER deal_value,
ADD COLUMN expected_close_date DATE NULL AFTER expected_award_date,
ADD COLUMN source VARCHAR(100) NULL COMMENT 'Lead source: Web, Referral, Cold Call, etc.' AFTER expected_close_date,
ADD COLUMN converted_from INT NULL COMMENT 'Original lead ID if converted' AFTER source,
ADD INDEX idx_lead_type (lead_type_id),
ADD INDEX idx_sales_stage (sales_stage_id),
ADD INDEX idx_source (source),
ADD INDEX idx_expected_close (expected_close_date);

-- Add foreign keys
ALTER TABLE tenders
ADD FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE SET NULL,
ADD FOREIGN KEY (sales_stage_id) REFERENCES sales_stages(id) ON DELETE SET NULL;

-- Step 2: Set default lead type for existing records (Tender)
UPDATE tenders SET lead_type_id = (SELECT id FROM lead_types WHERE name = 'Tender' LIMIT 1) WHERE lead_type_id IS NULL;

-- Step 3: Set default sales stage for existing records (New)
UPDATE tenders SET sales_stage_id = (SELECT id FROM sales_stages WHERE name = 'New' LIMIT 1) WHERE sales_stage_id IS NULL;

-- Step 4: Copy estimated_value to deal_value for existing records
UPDATE tenders SET deal_value = estimated_value WHERE deal_value IS NULL AND estimated_value IS NOT NULL;

-- Step 5: Rename table
RENAME TABLE tenders TO leads;

-- Step 6: Update foreign key references in other tables
-- Note: Foreign key constraint names may vary, so we'll handle them in the next migration
-- The table rename will automatically update the references, but we need to update constraint names

-- Step 7: Rename tender_number to lead_number (via new column and data migration)
-- First, add the new column
ALTER TABLE leads
ADD COLUMN lead_number VARCHAR(50) NULL AFTER id;

-- Copy data from tender_number to lead_number
UPDATE leads SET lead_number = tender_number WHERE lead_number IS NULL;

-- Drop old index and create new one
ALTER TABLE leads
DROP INDEX IF EXISTS idx_tender_number;

-- Make lead_number NOT NULL after data migration
ALTER TABLE leads
MODIFY COLUMN lead_number VARCHAR(50) NOT NULL;

-- Add unique index
ALTER TABLE leads
ADD UNIQUE INDEX idx_lead_number (lead_number);

-- Keep tender_number column for backward compatibility (can be dropped later)

-- DOWN
-- Reverse the migration (this is complex, so we'll keep it minimal)
RENAME TABLE leads TO tenders;

ALTER TABLE tenders
DROP FOREIGN KEY tenders_ibfk_lead_type,
DROP FOREIGN KEY tenders_ibfk_sales_stage,
DROP COLUMN lead_type_id,
DROP COLUMN sales_stage_id,
DROP COLUMN deal_value,
DROP COLUMN probability,
DROP COLUMN expected_close_date,
DROP COLUMN source,
DROP COLUMN converted_from,
DROP COLUMN lead_number;

