-- Migration: Add Marketing Module tables
-- UP

-- ============================================================
-- 1. Audience Segments (must come before marketing_campaigns)
-- ============================================================
CREATE TABLE IF NOT EXISTS audience_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSON COMMENT 'Filter conditions, e.g. {"industry":["IT"],"location":["India"],"leadStatus":["Qualified"]}',
  contact_count INT DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT TRUE COMMENT 'Dynamic segments auto-refresh based on criteria',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_audience_segments_created_by (created_by)
) ENGINE=InnoDB;

-- ============================================================
-- 2. Marketing Campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('email', 'social', 'multi-channel') DEFAULT 'multi-channel',
  status ENUM('draft', 'scheduled', 'active', 'paused', 'completed') DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  target_audience_id INT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (target_audience_id) REFERENCES audience_segments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_campaigns_status (status),
  INDEX idx_campaigns_created_by (created_by),
  INDEX idx_campaigns_start_date (start_date),
  INDEX idx_campaigns_end_date (end_date),
  INDEX idx_campaigns_deleted_at (deleted_at)
) ENGINE=InnoDB;

-- ============================================================
-- 3. Marketing Campaign Channels (social posts per campaign)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_campaign_channels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  channel ENUM('linkedin', 'facebook', 'twitter', 'instagram', 'youtube', 'email') NOT NULL,
  status ENUM('draft', 'scheduled', 'published', 'failed') DEFAULT 'draft',
  scheduled_at DATETIME,
  published_at DATETIME,
  post_content TEXT,
  media_urls JSON COMMENT 'Array of media URLs',
  ai_generated BOOLEAN DEFAULT FALSE,
  engagement_metrics JSON COMMENT '{"likes":0,"shares":0,"clicks":0,"impressions":0,"comments":0}',
  external_post_id VARCHAR(255) COMMENT 'ID from the social platform',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  INDEX idx_campaign_channels_campaign (campaign_id),
  INDEX idx_campaign_channels_channel (channel),
  INDEX idx_campaign_channels_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 4. Social Media Accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform ENUM('linkedin', 'facebook', 'twitter', 'instagram', 'youtube') NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_id VARCHAR(255) COMMENT 'Platform account ID',
  page_id VARCHAR(255) COMMENT 'For Facebook pages, LinkedIn company pages',
  access_token TEXT COMMENT 'Encrypted at application layer',
  refresh_token TEXT COMMENT 'Encrypted at application layer',
  token_expires_at DATETIME,
  profile_url VARCHAR(500),
  followers_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  connected_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (connected_by) REFERENCES users(id),
  INDEX idx_social_accounts_platform (platform),
  INDEX idx_social_accounts_connected_by (connected_by),
  INDEX idx_social_accounts_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- 5. Email Marketing Lists
-- ============================================================
CREATE TABLE IF NOT EXISTS email_marketing_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  segment_criteria JSON COMMENT 'Optional auto-sync criteria',
  contact_count INT DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_email_lists_created_by (created_by)
) ENGINE=InnoDB;

-- ============================================================
-- 6. Email Marketing List Members (stores emails directly)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_marketing_list_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  list_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  company_name VARCHAR(255),
  status ENUM('active', 'unsubscribed', 'bounced') DEFAULT 'active',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES email_marketing_lists(id) ON DELETE CASCADE,
  UNIQUE KEY uk_list_email (list_id, email),
  INDEX idx_list_members_email (email),
  INDEX idx_list_members_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 7. Email Marketing Campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS email_marketing_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NULL COMMENT 'Links to parent marketing campaign',
  list_id INT NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  from_name VARCHAR(255),
  status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed') DEFAULT 'draft',
  scheduled_at DATETIME,
  sent_at DATETIME,
  total_sent INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  total_bounced INT DEFAULT 0,
  total_unsubscribed INT DEFAULT 0,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (list_id) REFERENCES email_marketing_lists(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_email_campaigns_campaign (campaign_id),
  INDEX idx_email_campaigns_list (list_id),
  INDEX idx_email_campaigns_status (status),
  INDEX idx_email_campaigns_created_by (created_by)
) ENGINE=InnoDB;

-- ============================================================
-- 8. Marketing Content Calendar
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_content_calendar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content_type ENUM('social_post', 'email', 'blog', 'event', 'other') DEFAULT 'social_post',
  channel VARCHAR(50) COMMENT 'linkedin, facebook, twitter, instagram, youtube, email, blog',
  scheduled_date DATETIME NOT NULL,
  status ENUM('idea', 'draft', 'scheduled', 'published', 'cancelled') DEFAULT 'idea',
  campaign_id INT NULL,
  content TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_content_calendar_scheduled_date (scheduled_date),
  INDEX idx_content_calendar_status (status),
  INDEX idx_content_calendar_campaign (campaign_id),
  INDEX idx_content_calendar_created_by (created_by)
) ENGINE=InnoDB;

-- ============================================================
-- 9. Lead Capture Forms
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_capture_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  fields JSON NOT NULL COMMENT 'Array of {name, type, label, required, options}',
  thank_you_message TEXT,
  redirect_url VARCHAR(500),
  form_token VARCHAR(64) UNIQUE COMMENT 'Public token for embedding, generated at app layer',
  is_active BOOLEAN DEFAULT TRUE,
  submission_count INT DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_lead_forms_token (form_token),
  INDEX idx_lead_forms_active (is_active),
  INDEX idx_lead_forms_created_by (created_by)
) ENGINE=InnoDB;

-- ============================================================
-- 10. Lead Capture Submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_capture_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  data JSON NOT NULL COMMENT 'Submitted form field data',
  source_url VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  converted_to_lead_id INT NULL COMMENT 'FK to tenders table if converted to a lead',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES lead_capture_forms(id) ON DELETE CASCADE,
  INDEX idx_lead_submissions_form (form_id),
  INDEX idx_lead_submissions_converted (converted_to_lead_id),
  INDEX idx_lead_submissions_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 11. Marketing Analytics (aggregated metrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  channel VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL COMMENT 'e.g. impressions, clicks, conversions, spend',
  metric_value DECIMAL(15,2) DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  INDEX idx_analytics_campaign_channel (campaign_id, channel),
  INDEX idx_analytics_recorded_at (recorded_at),
  INDEX idx_analytics_metric_type (metric_type)
) ENGINE=InnoDB;


-- ============================================================
-- Seed Data
-- ============================================================

-- Seed default audience segments
INSERT IGNORE INTO audience_segments (name, description, criteria, is_dynamic, created_by) VALUES
  ('All Leads', 'All leads in the system', '{"leadStatus": ["all"]}', TRUE, 1),
  ('Qualified Leads', 'Leads marked as qualified', '{"leadStatus": ["Qualified"]}', TRUE, 1),
  ('IT Industry', 'Companies in the IT sector', '{"industry": ["IT", "Information Technology"]}', TRUE, 1),
  ('Government Sector', 'Government and public sector organizations', '{"industry": ["Government", "Public Sector"]}', TRUE, 1);

-- Seed a default email marketing list
INSERT IGNORE INTO email_marketing_lists (name, description, created_by) VALUES
  ('General Newsletter', 'Default mailing list for company newsletter', 1);

-- DOWN
-- DROP TABLE IF EXISTS marketing_analytics;
-- DROP TABLE IF EXISTS lead_capture_submissions;
-- DROP TABLE IF EXISTS lead_capture_forms;
-- DROP TABLE IF EXISTS marketing_content_calendar;
-- DROP TABLE IF EXISTS email_marketing_campaigns;
-- DROP TABLE IF EXISTS email_marketing_list_members;
-- DROP TABLE IF EXISTS email_marketing_lists;
-- DROP TABLE IF EXISTS social_media_accounts;
-- DROP TABLE IF EXISTS marketing_campaign_channels;
-- DROP TABLE IF EXISTS marketing_campaigns;
-- DROP TABLE IF EXISTS audience_segments;
