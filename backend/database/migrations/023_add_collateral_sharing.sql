-- Migration: Add product linking and sharing features to collateral repository
-- Date: 2026-04-13

-- Add product_line_id and product_id columns to collateral_items
ALTER TABLE collateral_items ADD COLUMN product_line_id INT NULL AFTER category_id;
ALTER TABLE collateral_items ADD COLUMN product_id INT NULL AFTER product_line_id;
ALTER TABLE collateral_items ADD INDEX idx_collateral_product_line (product_line_id);
ALTER TABLE collateral_items ADD INDEX idx_collateral_product (product_id);

-- Create public sharing links table
CREATE TABLE IF NOT EXISTS collateral_public_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collateral_id INT NOT NULL,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  created_by INT NOT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collateral_id) REFERENCES collateral_items(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_share_token (share_token),
  INDEX idx_collateral_public_link (collateral_id)
);

-- Create share log table for tracking share activity
CREATE TABLE IF NOT EXISTS collateral_share_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collateral_id INT NOT NULL,
  shared_by INT NOT NULL,
  channel ENUM('email','whatsapp','sms','linkedin','twitter','facebook','copy_link','other') NOT NULL,
  recipient_info VARCHAR(500) NULL,
  share_token VARCHAR(64) NULL,
  sent_as_attachment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collateral_id) REFERENCES collateral_items(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES users(id),
  INDEX idx_share_log_collateral (collateral_id),
  INDEX idx_share_log_user (shared_by)
);

-- Create link views tracking table
CREATE TABLE IF NOT EXISTS collateral_link_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  public_link_id INT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  action ENUM('view','download') DEFAULT 'view',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (public_link_id) REFERENCES collateral_public_links(id) ON DELETE CASCADE,
  INDEX idx_link_views_link (public_link_id)
);
