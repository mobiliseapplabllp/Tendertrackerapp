-- Migration: Add work log reminders table
-- Date: 2025-01-23

CREATE TABLE IF NOT EXISTS work_log_reminders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id INT NOT NULL,
    tender_id INT NOT NULL,
    action_required TEXT NOT NULL,
    due_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    completed_by INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (activity_id) REFERENCES tender_activities(id) ON DELETE CASCADE,
    FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity (activity_id),
    INDEX idx_tender (tender_id),
    INDEX idx_completed (is_completed),
    INDEX idx_due_date (due_date),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Work log reminder recipients (email and phone)
CREATE TABLE IF NOT EXISTS work_log_reminder_recipients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reminder_id INT NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reminder_id) REFERENCES work_log_reminders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_reminder (reminder_id),
    INDEX idx_email (email),
    INDEX idx_phone (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Work log reminder sent history
CREATE TABLE IF NOT EXISTS work_log_reminder_sent (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reminder_id INT NOT NULL,
    recipient_id INT NOT NULL,
    sent_via ENUM('email', 'sms', 'both') NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reminder_id) REFERENCES work_log_reminders(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES work_log_reminder_recipients(id) ON DELETE CASCADE,
    INDEX idx_reminder (reminder_id),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

