-- Migration: Add Role Permissions table
-- Date: 2026-04-13
-- Description: Creates role_permissions table and seeds default permission matrix

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(100) NOT NULL,
  permission_label VARCHAR(255) NOT NULL,
  permission_description VARCHAR(500),
  permission_group VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0,
  role_viewer BOOLEAN DEFAULT FALSE,
  role_user BOOLEAN DEFAULT FALSE,
  role_manager BOOLEAN DEFAULT TRUE,
  role_admin BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_permission_key (permission_key)
);

-- Seed default permissions

-- DASHBOARDS & VIEWS
INSERT INTO role_permissions (permission_key, permission_label, permission_description, permission_group, sort_order, role_viewer, role_user, role_manager, role_admin) VALUES
('view_dashboards', 'View Dashboards', 'Access dashboards and overview pages', 'DASHBOARDS & VIEWS', 1, TRUE, TRUE, TRUE, TRUE),
('view_reports', 'View Reports', 'Access reports and analytics', 'DASHBOARDS & VIEWS', 2, TRUE, TRUE, TRUE, TRUE);

-- CRM & SALES
INSERT INTO role_permissions (permission_key, permission_label, permission_description, permission_group, sort_order, role_viewer, role_user, role_manager, role_admin) VALUES
('view_leads', 'View Leads', 'See lead listings and details', 'CRM & SALES', 1, TRUE, TRUE, TRUE, TRUE),
('create_leads', 'Create Leads', 'Create new leads', 'CRM & SALES', 2, FALSE, TRUE, TRUE, TRUE),
('edit_leads', 'Edit Leads', 'Modify existing leads', 'CRM & SALES', 3, FALSE, TRUE, TRUE, TRUE),
('delete_leads', 'Delete Leads', 'Remove leads from system', 'CRM & SALES', 4, FALSE, FALSE, TRUE, TRUE),
('view_companies', 'View Companies', 'Access company directory', 'CRM & SALES', 5, TRUE, TRUE, TRUE, TRUE),
('manage_companies', 'Manage Companies', 'Create and edit companies', 'CRM & SALES', 6, FALSE, TRUE, TRUE, TRUE),
('view_sales_hub', 'View Sales Hub', 'Access sales pipeline and hub', 'CRM & SALES', 7, FALSE, TRUE, TRUE, TRUE),
('manage_teams', 'Manage Teams', 'Configure team structure and assignments', 'CRM & SALES', 8, FALSE, FALSE, TRUE, TRUE),
('manage_targets', 'Manage Targets', 'Set and modify sales targets', 'CRM & SALES', 9, FALSE, FALSE, TRUE, TRUE),
('manage_products', 'Manage Products', 'Product catalog management', 'CRM & SALES', 10, FALSE, FALSE, TRUE, TRUE);

-- TENDER MANAGEMENT
INSERT INTO role_permissions (permission_key, permission_label, permission_description, permission_group, sort_order, role_viewer, role_user, role_manager, role_admin) VALUES
('view_tenders', 'View Tenders', 'Access tender listings', 'TENDER MANAGEMENT', 1, TRUE, TRUE, TRUE, TRUE),
('create_tenders', 'Create Tenders', 'Create new tenders', 'TENDER MANAGEMENT', 2, FALSE, TRUE, TRUE, TRUE),
('manage_tenders', 'Manage Tenders', 'Edit and delete tenders', 'TENDER MANAGEMENT', 3, FALSE, TRUE, TRUE, TRUE),
('tender_scout', 'Tender Scout', 'Access tender scouting tools', 'TENDER MANAGEMENT', 4, FALSE, TRUE, TRUE, TRUE),
('ai_search', 'AI Search', 'Use AI-powered search', 'TENDER MANAGEMENT', 5, FALSE, TRUE, TRUE, TRUE);

-- MARKETING
INSERT INTO role_permissions (permission_key, permission_label, permission_description, permission_group, sort_order, role_viewer, role_user, role_manager, role_admin) VALUES
('view_campaigns', 'View Campaigns', 'Access marketing campaigns', 'MARKETING', 1, FALSE, TRUE, TRUE, TRUE),
('manage_campaigns', 'Manage Campaigns', 'Create and edit campaigns', 'MARKETING', 2, FALSE, TRUE, TRUE, TRUE),
('social_media', 'Social Media', 'Access social media management', 'MARKETING', 3, FALSE, TRUE, TRUE, TRUE),
('email_marketing', 'Email Marketing', 'Access email marketing', 'MARKETING', 4, FALSE, TRUE, TRUE, TRUE),
('lead_capture', 'Lead Capture', 'Manage lead capture forms', 'MARKETING', 5, FALSE, FALSE, TRUE, TRUE);

-- DOCUMENTS
INSERT INTO role_permissions (permission_key, permission_label, permission_description, permission_group, sort_order, role_viewer, role_user, role_manager, role_admin) VALUES
('view_documents', 'View Documents', 'Access document management', 'DOCUMENTS', 1, TRUE, TRUE, TRUE, TRUE),
('manage_collateral', 'Manage Collateral', 'Upload and manage collateral', 'DOCUMENTS', 2, FALSE, TRUE, TRUE, TRUE),
('share_collateral', 'Share Collateral', 'Share collateral externally', 'DOCUMENTS', 3, FALSE, TRUE, TRUE, TRUE);

-- SYSTEM
INSERT INTO role_permissions (permission_key, permission_label, permission_description, permission_group, sort_order, role_viewer, role_user, role_manager, role_admin) VALUES
('manage_users', 'User Management', 'Create and manage users', 'SYSTEM', 1, FALSE, FALSE, FALSE, TRUE),
('manage_settings', 'System Settings', 'Access system configuration', 'SYSTEM', 2, FALSE, FALSE, FALSE, TRUE),
('manage_categories', 'Categories & Tags', 'Manage categories and tags', 'SYSTEM', 3, FALSE, FALSE, FALSE, TRUE);
