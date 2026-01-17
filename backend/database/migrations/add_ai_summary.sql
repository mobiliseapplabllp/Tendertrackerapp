-- Add AI Summary column to tenders table
-- This stores the generated AI summary so it doesn't need to be regenerated on every page load

ALTER TABLE tenders 
ADD COLUMN ai_summary TEXT NULL COMMENT 'AI-generated summary of the tender',
ADD COLUMN ai_summary_generated_at TIMESTAMP NULL COMMENT 'Timestamp when AI summary was generated',
ADD COLUMN ai_summary_generated_by INT NULL COMMENT 'User ID who generated the AI summary',
ADD INDEX idx_ai_summary_generated_at (ai_summary_generated_at),
ADD FOREIGN KEY (ai_summary_generated_by) REFERENCES users(id) ON DELETE SET NULL;

