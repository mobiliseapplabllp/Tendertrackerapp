-- ============================================
-- MIGRATION: Add Proposal System
-- Date: 2026-04-06
-- Description: Proposals, line items, versions, templates
-- ============================================

-- 1. Proposal Templates
CREATE TABLE IF NOT EXISTS proposal_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    product_line_id INT NULL,
    sub_category ENUM('Software', 'Hardware', 'All') DEFAULT 'All',
    description TEXT,
    default_cover_letter TEXT,
    default_executive_summary TEXT,
    default_scope TEXT,
    default_terms_conditions TEXT,
    default_payment_terms TEXT,
    default_warranty TEXT,
    validity_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product_line (product_line_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Proposals
CREATE TABLE IF NOT EXISTS proposals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tender_id INT NOT NULL,
    template_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    proposal_type ENUM('Software', 'Hardware', 'Custom Development', 'Other') NOT NULL DEFAULT 'Software',
    status ENUM('Draft', 'Pending Approval', 'Approved', 'Submitted', 'Accepted', 'Rejected') DEFAULT 'Draft',
    current_version INT DEFAULT 1,
    cover_letter TEXT,
    executive_summary TEXT,
    scope_of_work TEXT,
    terms_conditions TEXT,
    payment_terms TEXT,
    warranty_terms TEXT,
    validity_period_days INT DEFAULT 30,
    valid_until DATE,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    original_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    subtotal DECIMAL(15,2) DEFAULT 0,
    total_tax DECIMAL(15,2) DEFAULT 0,
    total_discount DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'INR',
    submitted_to VARCHAR(255),
    submitted_to_email VARCHAR(255),
    submitted_at DATETIME NULL,
    approved_by INT NULL,
    approved_at DATETIME NULL,
    rejection_reason TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES proposal_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_tender (tender_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Proposal Line Items
CREATE TABLE IF NOT EXISTS proposal_line_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proposal_id INT NOT NULL,
    product_id INT NULL,
    parent_line_item_id INT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_type ENUM('Product', 'Bundle', 'Component', 'Service', 'Custom') DEFAULT 'Product',
    sku VARCHAR(50),
    hsn_code VARCHAR(20),
    unit_of_measure VARCHAR(50) DEFAULT 'Unit',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) DEFAULT 0,
    display_order INT DEFAULT 0,
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_line_item_id) REFERENCES proposal_line_items(id) ON DELETE CASCADE,
    INDEX idx_proposal (proposal_id),
    INDEX idx_parent (parent_line_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Proposal Versions
CREATE TABLE IF NOT EXISTS proposal_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proposal_id INT NOT NULL,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    change_note TEXT,
    grand_total DECIMAL(15,2),
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_proposal (proposal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed default templates
INSERT IGNORE INTO proposal_templates (name, sub_category, description, default_terms_conditions, default_payment_terms, default_warranty, validity_days) VALUES
('Software Solution Proposal', 'Software', 'Standard template for software solutions',
 'All deliverables shall be provided as specified in the scope of work. Any changes to scope will require a change request and additional pricing.',
 'Payment Terms: 50% advance, 30% on delivery, 20% post go-live.\nPayment due within 30 days of invoice.',
 'Software warranty: 12 months from go-live date.\nIncludes bug fixes and minor updates.', 30),
('Hardware Supply Proposal', 'Hardware', 'Standard template for hardware procurement',
 'All equipment supplied will be genuine, factory-sealed, and carry manufacturer warranty. Installation and commissioning included where specified.',
 'Payment Terms: 60% advance with PO, 40% on delivery and installation.\nPayment due within 15 days of invoice.',
 'Hardware warranty: As per manufacturer terms (minimum 12 months).\nOn-site support during warranty period.', 30),
('Custom Development Proposal', 'All', 'Template for custom software development projects',
 'Development will follow Agile methodology with bi-weekly sprints. Source code will be handed over upon final payment. IP rights transfer on completion.',
 'Payment Terms: Milestone-based.\n20% advance, remaining split across milestones.\nPayment due within 30 days of milestone acceptance.',
 'Warranty: 6 months post go-live.\nIncludes bug fixes only. Feature additions charged separately.', 45);
