-- ============================================
-- MIGRATION: Add Sales Team Structure & Targets
-- Date: 2026-03-15
-- Description: Adds sales_targets, sales_team_assignments, sales_team_history tables,
--              is_sales_head flag, and won_date/lost_date/loss_reason on tenders
-- ============================================

-- 1. Add is_sales_head to user_product_lines
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_product_lines'
    AND COLUMN_NAME = 'is_sales_head');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE user_product_lines ADD COLUMN is_sales_head BOOLEAN DEFAULT FALSE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add won_date, lost_date, loss_reason to tenders
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenders'
    AND COLUMN_NAME = 'won_date');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE tenders ADD COLUMN won_date DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenders'
    AND COLUMN_NAME = 'lost_date');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE tenders ADD COLUMN lost_date DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenders'
    AND COLUMN_NAME = 'loss_reason');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE tenders ADD COLUMN loss_reason VARCHAR(255) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Sales Targets table
CREATE TABLE IF NOT EXISTS sales_targets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_line_id INT NOT NULL,
    sub_category ENUM('Software', 'Hardware', 'All') NOT NULL DEFAULT 'All',
    period_type ENUM('quarterly', 'yearly') NOT NULL,
    period_year INT NOT NULL,
    period_quarter INT NULL,
    target_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    target_deals INT NULL,
    achieved_value DECIMAL(15,2) DEFAULT 0,
    achieved_deals INT DEFAULT 0,
    status ENUM('Draft', 'Active', 'Closed') NOT NULL DEFAULT 'Draft',
    set_by INT NULL,
    approved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (set_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_target (user_id, product_line_id, sub_category, period_type, period_year, period_quarter),
    INDEX idx_user_period (user_id, period_year, period_quarter),
    INDEX idx_product_line_period (product_line_id, period_year, period_quarter),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Sales Team Assignments table
CREATE TABLE IF NOT EXISTS sales_team_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_head_id INT NOT NULL,
    team_member_id INT NOT NULL,
    product_line_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_at DATETIME NULL,
    assigned_by INT NULL,
    FOREIGN KEY (sales_head_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_member_product (team_member_id, product_line_id),
    INDEX idx_sales_head (sales_head_id),
    INDEX idx_product_line (product_line_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sales Team History (audit trail)
CREATE TABLE IF NOT EXISTS sales_team_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action ENUM('assigned', 'removed', 'transferred', 'promoted_head', 'demoted_head') NOT NULL,
    user_id INT NOT NULL,
    product_line_id INT NOT NULL,
    from_product_line_id INT NULL,
    performed_by INT NOT NULL,
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_product_line (product_line_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Backfill won_date from status for existing Won tenders
UPDATE tenders SET won_date = updated_at WHERE status = 'Won' AND won_date IS NULL;
UPDATE tenders SET lost_date = updated_at WHERE status = 'Lost' AND lost_date IS NULL;
