-- Migration: Add activity types and enhanced activity tracking
-- Date: 2025-01-27
-- Description: Create activity types and enhanced activity tables for CRM

-- UP
CREATE TABLE IF NOT EXISTS activity_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default activity types
INSERT INTO activity_types (name, description, icon, color, is_active) VALUES
('Call', 'Phone call activity', 'Phone', '#3B82F6', TRUE),
('Meeting', 'In-person or virtual meeting', 'Calendar', '#10B981', TRUE),
('Email', 'Email communication', 'Mail', '#8B5CF6', TRUE),
('Task', 'Task or to-do item', 'CheckSquare', '#F59E0B', TRUE),
('Note', 'General note or comment', 'FileText', '#6B7280', TRUE),
('Created', 'Record created', 'Plus', '#6B7280', TRUE),
('Updated', 'Record updated', 'Edit', '#6B7280', TRUE),
('Status Changed', 'Status changed', 'RefreshCw', '#3B82F6', TRUE),
('Document Added', 'Document uploaded', 'Paperclip', '#8B5CF6', TRUE),
('Assigned', 'Record assigned', 'UserCheck', '#10B981', TRUE),
('Deadline Changed', 'Deadline changed', 'Clock', '#F59E0B', TRUE)
ON DUPLICATE KEY UPDATE name=name;

CREATE TABLE IF NOT EXISTS calls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lead_id INT,
    contact_id INT,
    company_id INT,
    user_id INT NOT NULL,
    call_type ENUM('Inbound', 'Outbound') DEFAULT 'Outbound',
    phone_number VARCHAR(20),
    duration_seconds INT DEFAULT 0,
    outcome VARCHAR(100),
    notes TEXT,
    call_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_lead (lead_id),
    INDEX idx_contact (contact_id),
    INDEX idx_company (company_id),
    INDEX idx_user (user_id),
    INDEX idx_call_date (call_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meetings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lead_id INT,
    contact_id INT,
    company_id INT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    location VARCHAR(255),
    meeting_type ENUM('In-Person', 'Virtual', 'Phone') DEFAULT 'In-Person',
    status ENUM('Scheduled', 'Completed', 'Cancelled', 'Rescheduled') DEFAULT 'Scheduled',
    outcome TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_lead (lead_id),
    INDEX idx_contact (contact_id),
    INDEX idx_company (company_id),
    INDEX idx_user (user_id),
    INDEX idx_meeting_date (meeting_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lead_id INT,
    contact_id INT,
    company_id INT,
    user_id INT NOT NULL,
    subject VARCHAR(255),
    recipient_email VARCHAR(254) NOT NULL,
    email_type ENUM('Sent', 'Received') DEFAULT 'Sent',
    body TEXT,
    sent_at DATETIME,
    opened_at DATETIME NULL,
    clicked_at DATETIME NULL,
    status ENUM('Sent', 'Delivered', 'Opened', 'Clicked', 'Bounced', 'Failed') DEFAULT 'Sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_lead (lead_id),
    INDEX idx_contact (contact_id),
    INDEX idx_company (company_id),
    INDEX idx_user (user_id),
    INDEX idx_sent_at (sent_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lead_id INT,
    contact_id INT,
    company_id INT,
    user_id INT NOT NULL,
    assigned_to INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATETIME,
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    status ENUM('Not Started', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Not Started',
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lead (lead_id),
    INDEX idx_contact (contact_id),
    INDEX idx_company (company_id),
    INDEX idx_user (user_id),
    INDEX idx_assigned (assigned_to),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOWN
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS calls;
DROP TABLE IF EXISTS activity_types;


