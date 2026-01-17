-- Migration: Add lead types table
-- Date: 2025-01-27
-- Description: Create lead_types table for CRM transformation

-- UP
CREATE TABLE IF NOT EXISTS lead_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_active (is_active),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default lead types
INSERT INTO lead_types (name, description, icon, color, display_order, is_active) VALUES
('Tender', 'Formal procurement opportunity', 'FileText', '#3B82F6', 1, TRUE),
('Lead', 'General sales opportunity', 'UserPlus', '#10B981', 2, TRUE),
('Opportunity', 'Qualified sales opportunity', 'TrendingUp', '#F59E0B', 3, TRUE),
('Prospect', 'Potential customer', 'Users', '#8B5CF6', 4, TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- DOWN
DROP TABLE IF EXISTS lead_types;


