-- Migration: Add sales stages and pipeline tables
-- Date: 2025-01-27
-- Description: Create sales pipeline structure for CRM

-- UP
CREATE TABLE IF NOT EXISTS sales_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    probability INT DEFAULT 0 COMMENT 'Win probability percentage (0-100)',
    is_active BOOLEAN DEFAULT TRUE,
    is_won BOOLEAN DEFAULT FALSE,
    is_lost BOOLEAN DEFAULT FALSE,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_display_order (display_order),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default sales stages
INSERT INTO sales_stages (name, description, display_order, probability, is_active, is_won, is_lost, color) VALUES
('New', 'Newly created lead', 1, 10, TRUE, FALSE, FALSE, '#6B7280'),
('Qualified', 'Lead has been qualified', 2, 25, TRUE, FALSE, FALSE, '#3B82F6'),
('Proposal', 'Proposal sent to customer', 3, 50, TRUE, FALSE, FALSE, '#8B5CF6'),
('Negotiation', 'In negotiation phase', 4, 75, TRUE, FALSE, FALSE, '#F59E0B'),
('Won', 'Deal won', 5, 100, TRUE, TRUE, FALSE, '#10B981'),
('Lost', 'Deal lost', 6, 0, TRUE, FALSE, TRUE, '#EF4444')
ON DUPLICATE KEY UPDATE name=name;

CREATE TABLE IF NOT EXISTS pipeline_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lead_type_id INT,
    stage_id INT NOT NULL,
    display_order INT DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_type_id) REFERENCES lead_types(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES sales_stages(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lead_type_stage (lead_type_id, stage_id),
    INDEX idx_lead_type (lead_type_id),
    INDEX idx_stage (stage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOWN
DROP TABLE IF EXISTS pipeline_config;
DROP TABLE IF EXISTS sales_stages;


