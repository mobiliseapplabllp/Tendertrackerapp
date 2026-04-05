-- Migration: Add Collateral Repository tables
-- UP

-- Categories for collateral (Brochure, Product Video, Case Study, etc.)
CREATE TABLE IF NOT EXISTS collateral_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Main collateral items table
CREATE TABLE IF NOT EXISTS collateral_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_extension VARCHAR(20),
  thumbnail_path VARCHAR(500),
  download_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (category_id) REFERENCES collateral_categories(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_collateral_category (category_id),
  INDEX idx_collateral_uploaded_by (uploaded_by),
  INDEX idx_collateral_deleted_at (deleted_at),
  FULLTEXT INDEX idx_collateral_search (title, description)
);

-- Tags for collateral items (project tags + product tags)
CREATE TABLE IF NOT EXISTS collateral_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tag_type ENUM('project', 'product', 'general') NOT NULL DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tag_name_type (name, tag_type)
);

-- Junction table: collateral items <-> tags
CREATE TABLE IF NOT EXISTS collateral_item_tags (
  collateral_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (collateral_id, tag_id),
  FOREIGN KEY (collateral_id) REFERENCES collateral_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES collateral_tags(id) ON DELETE CASCADE
);

-- Seed default categories
INSERT IGNORE INTO collateral_categories (name, slug, description, icon, sort_order) VALUES
  ('Brochures', 'brochures', 'Company and product brochures', 'book-open', 1),
  ('Product Videos', 'product-videos', 'Product demos, walkthroughs, and promotional videos', 'video', 2),
  ('Case Studies', 'case-studies', 'Client success stories and case studies', 'award', 3),
  ('Presentations', 'presentations', 'Sales decks, pitch decks, and presentations', 'presentation', 4),
  ('Proposal Templates', 'proposal-templates', 'Reusable proposal and bid templates', 'file-text', 5),
  ('Capability Statements', 'capability-statements', 'Company capability and competency documents', 'shield', 6),
  ('Solution Briefs', 'solution-briefs', 'Product and solution overview documents', 'lightbulb', 7),
  ('Whitepapers', 'whitepapers', 'Technical whitepapers and thought leadership', 'file-search', 8);

-- Seed some default tags
INSERT IGNORE INTO collateral_tags (name, tag_type) VALUES
  ('Cloud Services', 'product'),
  ('AI/ML', 'product'),
  ('Data Analytics', 'product'),
  ('DevOps', 'product'),
  ('Cybersecurity', 'product'),
  ('Digital Transformation', 'product'),
  ('Managed Services', 'product'),
  ('Haryana Sports', 'project'),
  ('Haryana Education', 'project'),
  ('Bangladesh', 'project');

-- DOWN
-- DROP TABLE IF EXISTS collateral_item_tags;
-- DROP TABLE IF EXISTS collateral_tags;
-- DROP TABLE IF EXISTS collateral_items;
-- DROP TABLE IF EXISTS collateral_categories;
