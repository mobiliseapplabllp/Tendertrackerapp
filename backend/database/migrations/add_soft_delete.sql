-- Migration: Add soft delete support to tenders, documents, and tender_activities
-- Date: 2025-01-XX

-- UP
-- Add deleted_at and deleted_by to tenders table
ALTER TABLE tenders 
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at,
ADD COLUMN deleted_by INT NULL AFTER deleted_at,
ADD INDEX idx_deleted (deleted_at);

ALTER TABLE tenders 
ADD CONSTRAINT tenders_ibfk_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add deleted_at and deleted_by to documents table
ALTER TABLE documents 
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER uploaded_at,
ADD COLUMN deleted_by INT NULL AFTER deleted_at,
ADD INDEX idx_deleted (deleted_at);

ALTER TABLE documents 
ADD CONSTRAINT documents_ibfk_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add deleted_at to tender_activities table
ALTER TABLE tender_activities 
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER created_at,
ADD INDEX idx_deleted (deleted_at);

-- DOWN
-- Note: Rollback would require dropping columns, but we'll keep them for safety