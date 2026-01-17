-- Migration: Set default CRM values for existing tenders
-- Date: 2025-01-27
-- Description: Set default lead_type_id and sales_stage_id for existing tender records

-- UP
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

-- Set default probability based on status (if probability is 0)
UPDATE tenders 
SET probability = CASE 
  WHEN status = 'Won' THEN 100
  WHEN status = 'Lost' THEN 0
  WHEN status = 'Shortlisted' THEN 75
  WHEN status = 'Under Review' THEN 50
  WHEN status = 'Submitted' THEN 25
  ELSE 10
END
WHERE probability = 0 OR probability IS NULL;

-- DOWN
-- No rollback needed - this is just data updates


