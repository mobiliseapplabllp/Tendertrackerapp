-- Migration: Rename tender-related tables to lead-related
-- Date: 2025-01-27
-- Description: Rename categories, tags, and activities tables

-- UP
-- Rename tender_categories to lead_categories
RENAME TABLE tender_categories TO lead_categories;

-- Rename tender_tags to lead_tags
RENAME TABLE tender_tags TO lead_tags;

-- Rename tender_tag_relations to lead_tag_relations
RENAME TABLE tender_tag_relations TO lead_tag_relations;

-- Update foreign key in lead_tag_relations
ALTER TABLE lead_tag_relations
DROP FOREIGN KEY tender_tag_relations_ibfk_1,
DROP FOREIGN KEY tender_tag_relations_ibfk_2,
ADD CONSTRAINT lead_tag_relations_ibfk_1 FOREIGN KEY (tender_id) REFERENCES leads(id) ON DELETE CASCADE,
ADD CONSTRAINT lead_tag_relations_ibfk_2 FOREIGN KEY (tag_id) REFERENCES lead_tags(id) ON DELETE CASCADE;

-- Rename tender_activities to lead_activities
RENAME TABLE tender_activities TO lead_activities;

-- Update foreign key in lead_activities
ALTER TABLE lead_activities
DROP FOREIGN KEY IF EXISTS tender_activities_ibfk_1;

ALTER TABLE lead_activities
ADD CONSTRAINT lead_activities_ibfk_1 FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- Update column name in lead_activities from tender_id to lead_id
ALTER TABLE lead_activities
CHANGE COLUMN tender_id lead_id INT NOT NULL;

-- Update column name in documents from tender_id to lead_id
ALTER TABLE documents
CHANGE COLUMN tender_id lead_id INT;

-- Update foreign key in documents
ALTER TABLE documents
DROP FOREIGN KEY IF EXISTS documents_ibfk_1;

ALTER TABLE documents
ADD CONSTRAINT documents_ibfk_1 FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- Update index name in documents
ALTER TABLE documents
DROP INDEX idx_tender,
ADD INDEX idx_lead (lead_id);

-- Update email_notifications table column name
ALTER TABLE email_notifications
CHANGE COLUMN tender_id lead_id INT;

-- Update foreign key in email_notifications
ALTER TABLE email_notifications
DROP FOREIGN KEY IF EXISTS email_notifications_ibfk_2;

ALTER TABLE email_notifications
ADD CONSTRAINT email_notifications_ibfk_2 FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- Update calls table column name
ALTER TABLE calls
CHANGE COLUMN tender_id lead_id INT;

-- Update meetings table column name
ALTER TABLE meetings
CHANGE COLUMN tender_id lead_id INT;

-- Update email_logs table column name
ALTER TABLE email_logs
CHANGE COLUMN tender_id lead_id INT;

-- Update tasks table column name
ALTER TABLE tasks
CHANGE COLUMN tender_id lead_id INT;

-- DOWN
RENAME TABLE lead_categories TO tender_categories;
RENAME TABLE lead_tags TO tender_tags;
RENAME TABLE lead_tag_relations TO tender_tag_relations;
RENAME TABLE lead_activities TO tender_activities;

ALTER TABLE tender_tag_relations
DROP FOREIGN KEY lead_tag_relations_ibfk_1,
DROP FOREIGN KEY lead_tag_relations_ibfk_2,
ADD CONSTRAINT tender_tag_relations_ibfk_1 FOREIGN KEY (tender_id) REFERENCES leads(id) ON DELETE CASCADE,
ADD CONSTRAINT tender_tag_relations_ibfk_2 FOREIGN KEY (tag_id) REFERENCES tender_tags(id) ON DELETE CASCADE;

ALTER TABLE tender_activities
CHANGE COLUMN lead_id tender_id INT NOT NULL;

ALTER TABLE documents
CHANGE COLUMN lead_id tender_id INT;

ALTER TABLE email_notifications
CHANGE COLUMN lead_id tender_id INT;

ALTER TABLE calls
CHANGE COLUMN lead_id tender_id INT;

ALTER TABLE meetings
CHANGE COLUMN lead_id tender_id INT;

ALTER TABLE email_logs
CHANGE COLUMN lead_id tender_id INT;

ALTER TABLE tasks
CHANGE COLUMN lead_id tender_id INT;

