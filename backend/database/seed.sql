-- ============================================
-- SEED DATA FOR TENDER TRACKING DATABASE
-- ============================================
-- Only admin user is kept, all other dummy data removed

-- Insert default admin user (password: Admin@123)
-- Hash generated using bcrypt with 10 rounds
INSERT IGNORE INTO users (email, password_hash, full_name, role, status) VALUES
('admin@tendertrack.com', '$2b$10$lkFh74Se9Wf9kWQV/HO.VOzaKms0RQVNnbJ7gpNMuEdBVxIK10Urm', 'System Administrator', 'Admin', 'Active');

-- Insert system document categories (minimal system categories only)
INSERT IGNORE INTO document_categories (name, description, icon, is_system) VALUES
('Tax Documents', 'Tax related documents like GSTIN, PAN', 'FileText', TRUE),
('Certifications', 'ISO, Quality certifications', 'Award', TRUE),
('Company Documents', 'Company registration, incorporation', 'Building2', TRUE),
('Financial Documents', 'Bank statements, financial records', 'DollarSign', TRUE),
('Technical Documents', 'Technical specifications, drawings', 'Wrench', TRUE),
('Legal Documents', 'Contracts, agreements, legal papers', 'Scale', TRUE);

-- Insert system configuration
INSERT IGNORE INTO system_config (config_key, config_value, config_type, description) VALUES
('email_enabled', 'true', 'boolean', 'Enable/disable email notifications'),
('sms_enabled', 'false', 'boolean', 'Enable/disable SMS notifications'),
('session_timeout_minutes', '30', 'number', 'User session timeout in minutes'),
('max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB'),
('deadline_reminder_days', '7,3,1', 'string', 'Days before deadline to send reminders');
