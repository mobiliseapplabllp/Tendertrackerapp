-- Migration: Add configuration tables for dynamic settings
-- Created: 2026-01-17
-- Purpose: Move hardcoded values to database for runtime configuration
-- Database: MySQL

-- System-wide settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (setting_type IN ('string', 'number', 'boolean', 'json'))
);

-- Configurable dropdown options table
CREATE TABLE IF NOT EXISTS dropdown_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    option_type VARCHAR(50) NOT NULL,
    option_value VARCHAR(100) NOT NULL,
    option_label VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    color_class VARCHAR(100),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_option (option_type, option_value)
);

-- Create indexes for performance (MySQL doesn't support IF NOT EXISTS for indexes)
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

CREATE INDEX idx_system_settings_category ON system_settings(category);

CREATE INDEX idx_dropdown_options_type ON dropdown_options(option_type, is_active);

CREATE INDEX idx_dropdown_options_order ON dropdown_options(option_type, display_order);

-- Insert initial system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, category, is_editable) VALUES
('document.max_file_size_mb', '10', 'number', 'Maximum file upload size in MB', 'document', TRUE),
('document.allowed_extensions', '["pdf","doc","docx","xls","xlsx","jpg","jpeg","png"]', 'json', 'Allowed file extensions for upload', 'document', TRUE),
('document.default_category_id', '1', 'number', 'Default category for document uploads', 'document', TRUE),
('lead.default_currency', 'INR', 'string', 'Default currency for new leads', 'lead', TRUE),
('lead.default_status', 'Draft', 'string', 'Default status for new leads', 'lead', TRUE),
('lead.default_priority', 'Medium', 'string', 'Default priority for new leads', 'lead', TRUE);

-- Insert lead status options
INSERT IGNORE INTO dropdown_options (option_type, option_value, option_label, display_order, color_class, is_system, is_active) VALUES
('lead_status', 'Draft', 'Draft', 1, 'bg-gray-100 text-gray-800', TRUE, TRUE),
('lead_status', 'Submitted', 'Submitted', 2, 'bg-blue-100 text-blue-800', TRUE, TRUE),
('lead_status', 'Under Review', 'Under Review', 3, 'bg-yellow-100 text-yellow-800', TRUE, TRUE),
('lead_status', 'Shortlisted', 'Shortlisted', 4, 'bg-purple-100 text-purple-800', TRUE, TRUE),
('lead_status', 'Won', 'Won', 5, 'bg-green-100 text-green-800', TRUE, TRUE),
('lead_status', 'Lost', 'Lost', 6, 'bg-red-100 text-red-800', TRUE, TRUE),
('lead_status', 'Cancelled', 'Cancelled', 7, 'bg-gray-100 text-gray-600', TRUE, TRUE);

-- Insert lead priority options
INSERT IGNORE INTO dropdown_options (option_type, option_value, option_label, display_order, color_class, is_system, is_active) VALUES
('lead_priority', 'Low', 'Low', 1, 'bg-gray-100 text-gray-700', TRUE, TRUE),
('lead_priority', 'Medium', 'Medium', 2, 'bg-blue-100 text-blue-700', TRUE, TRUE),
('lead_priority', 'High', 'High', 3, 'bg-orange-100 text-orange-700', TRUE, TRUE),
('lead_priority', 'Critical', 'Critical', 4, 'bg-red-100 text-red-700', TRUE, TRUE);

-- Insert currency options
INSERT IGNORE INTO dropdown_options (option_type, option_value, option_label, display_order, is_system, is_active) VALUES
('currency', 'INR', 'INR (₹)', 1, TRUE, TRUE),
('currency', 'USD', 'USD ($)', 2, TRUE, TRUE),
('currency', 'EUR', 'EUR (€)', 3, TRUE, TRUE),
('currency', 'GBP', 'GBP (£)', 4, TRUE, TRUE),
('currency', 'AUD', 'AUD (A$)', 5, FALSE, TRUE),
('currency', 'CAD', 'CAD (C$)', 6, FALSE, TRUE),
('currency', 'JPY', 'JPY (¥)', 7, FALSE, TRUE),
('currency', 'SGD', 'SGD (S$)', 8, FALSE, TRUE),
('currency', 'CHF', 'CHF (Fr)', 9, FALSE, TRUE);
