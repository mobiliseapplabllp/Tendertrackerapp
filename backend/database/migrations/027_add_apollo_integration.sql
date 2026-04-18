-- Migration 027: Add Apollo Integration
-- Adds Apollo tracking columns to companies and contacts,
-- links email list members to contacts, adds target_list_id to campaign channels,
-- and creates apollo_import_log table.

-- Apollo tracking on companies
ALTER TABLE companies ADD COLUMN apollo_org_id VARCHAR(100) NULL;
ALTER TABLE companies ADD COLUMN linkedin_url VARCHAR(500) NULL;
ALTER TABLE companies ADD COLUMN employee_count INT NULL;
ALTER TABLE companies ADD COLUMN annual_revenue DECIMAL(15,2) NULL;

-- Apollo tracking on contacts
ALTER TABLE contacts ADD COLUMN apollo_contact_id VARCHAR(100) NULL;
ALTER TABLE contacts ADD COLUMN linkedin_url VARCHAR(500) NULL;
-- title column may already exist; if so this ALTER will error harmlessly
ALTER TABLE contacts ADD COLUMN title VARCHAR(255) NULL;

-- Link email list members to contacts table
ALTER TABLE email_marketing_list_members ADD COLUMN contact_id INT NULL;

-- Target list for campaign channels (which email list to send to)
ALTER TABLE marketing_campaign_channels ADD COLUMN target_list_id INT NULL;

-- Apollo import log
CREATE TABLE IF NOT EXISTS apollo_import_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  import_type ENUM('people_search','org_search','enrichment') NOT NULL,
  search_criteria JSON,
  results_count INT DEFAULT 0,
  imported_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  imported_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (imported_by) REFERENCES users(id)
);
