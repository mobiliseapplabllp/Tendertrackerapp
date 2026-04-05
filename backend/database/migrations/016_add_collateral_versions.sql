-- Migration: Add Collateral Version History
-- UP

CREATE TABLE IF NOT EXISTS collateral_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collateral_id INT NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_extension VARCHAR(20),
  change_note TEXT,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collateral_id) REFERENCES collateral_items(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_version_collateral (collateral_id),
  INDEX idx_version_number (collateral_id, version_number)
);

-- Add current_version column to collateral_items
ALTER TABLE collateral_items ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

-- DOWN
-- ALTER TABLE collateral_items DROP COLUMN current_version;
-- DROP TABLE IF EXISTS collateral_versions;
