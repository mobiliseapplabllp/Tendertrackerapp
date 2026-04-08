-- ============================================
-- MIGRATION: Add Product Catalog & BOM System
-- Date: 2026-04-06
-- Description: Product categories, master catalog, BOM for bundles
-- ============================================

-- 1. Product Categories (Hardware, Software, Service, Consumable)
CREATE TABLE IF NOT EXISTS product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Master Product Catalog
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    product_line_id INT NULL,
    sub_category ENUM('Software', 'Hardware', 'Service', 'Consumable') NOT NULL DEFAULT 'Hardware',
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'INR',
    unit_of_measure VARCHAR(50) DEFAULT 'Unit',
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    hsn_code VARCHAR(20),
    is_standalone BOOLEAN DEFAULT TRUE,
    is_bundle BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(500),
    tags JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product_line (product_line_id),
    INDEX idx_category (category_id),
    INDEX idx_sku (sku),
    INDEX idx_active (is_active),
    INDEX idx_bundle (is_bundle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BOM (Bill of Materials) - Bundle components
CREATE TABLE IF NOT EXISTS product_bom (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parent_product_id INT NOT NULL,
    component_product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    is_optional BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    notes VARCHAR(255),
    FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_bom (parent_product_id, component_product_id),
    INDEX idx_parent (parent_product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed default product categories
INSERT IGNORE INTO product_categories (name, description, icon, display_order) VALUES
('Hardware', 'Physical devices and equipment', 'Cpu', 1),
('Software', 'Software licenses and subscriptions', 'Code', 2),
('Services', 'Implementation, training, and support', 'Wrench', 3),
('Consumables', 'Consumable items and accessories', 'Package', 4),
('Networking', 'Network equipment and accessories', 'Wifi', 5),
('Security', 'Security devices and systems', 'Shield', 6);
