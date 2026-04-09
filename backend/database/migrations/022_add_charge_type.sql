-- Add charge_type to distinguish one-time vs recurring line items
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'proposal_line_items'
    AND COLUMN_NAME = 'charge_type');

SET @sql = IF(@col_exists = 0,
    "ALTER TABLE proposal_line_items ADD COLUMN charge_type ENUM('one-time', 'recurring') DEFAULT 'one-time'",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
