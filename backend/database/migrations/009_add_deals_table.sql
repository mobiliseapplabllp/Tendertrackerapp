-- Migration: Add deals table for deal management
-- Date: 2025-01-27
-- Description: Create deals table for tracking opportunities and forecasting

-- UP
CREATE TABLE IF NOT EXISTS deals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lead_id INT NOT NULL,
    deal_name VARCHAR(255) NOT NULL,
    deal_value DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    probability INT DEFAULT 0 COMMENT 'Win probability percentage (0-100)',
    expected_close_date DATE NOT NULL,
    actual_close_date DATE NULL,
    sales_stage_id INT NOT NULL,
    assigned_to INT,
    created_by INT NOT NULL,
    won_at DATETIME NULL,
    lost_at DATETIME NULL,
    lost_reason TEXT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (sales_stage_id) REFERENCES sales_stages(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_lead (lead_id),
    INDEX idx_sales_stage (sales_stage_id),
    INDEX idx_assigned (assigned_to),
    INDEX idx_expected_close (expected_close_date),
    INDEX idx_actual_close (actual_close_date),
    INDEX idx_won (won_at),
    INDEX idx_lost (lost_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_forecasts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    forecast_period VARCHAR(20) NOT NULL COMMENT 'YYYY-MM format',
    forecast_type ENUM('Monthly', 'Quarterly', 'Yearly') DEFAULT 'Monthly',
    total_pipeline_value DECIMAL(15, 2) DEFAULT 0,
    weighted_pipeline_value DECIMAL(15, 2) DEFAULT 0 COMMENT 'Probability-weighted value',
    won_deals_value DECIMAL(15, 2) DEFAULT 0,
    lost_deals_value DECIMAL(15, 2) DEFAULT 0,
    deal_count INT DEFAULT 0,
    won_count INT DEFAULT 0,
    lost_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_period_type (forecast_period, forecast_type),
    INDEX idx_period (forecast_period),
    INDEX idx_type (forecast_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOWN
DROP TABLE IF EXISTS sales_forecasts;
DROP TABLE IF EXISTS deals;


