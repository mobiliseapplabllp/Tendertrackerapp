-- ============================================
-- MIGRATION: Add Product Lines Feature
-- Date: 2026-03-15
-- Description: Adds product_lines table, user_product_lines junction table,
--              and product_line_id + sub_category columns to tenders/leads table
-- ============================================

-- 1. Product Lines master table
CREATE TABLE IF NOT EXISTS product_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Seed the 4 product lines
INSERT IGNORE INTO product_lines (name, description, display_order) VALUES
    ('EduPro', 'Education management platform', 1),
    ('OpsSuite', 'Operations management suite', 2),
    ('SCMPro', 'Supply chain management platform', 3),
    ('HREvO', 'HR evolution platform', 4);

-- 3. User-Product Line junction table (many-to-many)
CREATE TABLE IF NOT EXISTS user_product_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_line_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_line_id),
    INDEX idx_user (user_id),
    INDEX idx_product_line (product_line_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add product_line_id and sub_category to tenders table
-- (Note: The table might be named 'tenders' or 'leads' depending on migration state)

-- Try adding to 'tenders' table first
ALTER TABLE tenders
    ADD COLUMN IF NOT EXISTS product_line_id INT NULL,
    ADD COLUMN IF NOT EXISTS sub_category ENUM('Software', 'Hardware') NULL;

-- Add foreign key (wrapped in procedure to handle if already exists)
-- Check if FK already exists before adding
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenders'
    AND CONSTRAINT_NAME = 'fk_tenders_product_line');

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE tenders ADD CONSTRAINT fk_tenders_product_line FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for product_line_id
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenders'
    AND INDEX_NAME = 'idx_product_line');

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE tenders ADD INDEX idx_product_line (product_line_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for sub_category
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenders'
    AND INDEX_NAME = 'idx_sub_category');

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE tenders ADD INDEX idx_sub_category (sub_category)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT * FROM product_lines;
-- DESCRIBE tenders;
-- DESCRIBE user_product_lines;
-- SELECT COUNT(*) FROM product_lines; -- Should be 4
