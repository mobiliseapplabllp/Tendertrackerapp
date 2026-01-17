-- Add Tender Scout Tables

-- 1. Scout Sources Configuration
CREATE TABLE IF NOT EXISTS tender_scout_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    source_type ENUM('website', 'api', 'rss', 'google_search') NOT NULL,
    url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    scraping_config JSON,
    last_scraped_at TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_active (is_active),
    INDEX idx_last_scraped (last_scraped_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. User Interests Profiles
CREATE TABLE IF NOT EXISTS tender_scout_interests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    name VARCHAR(200) NOT NULL,
    keywords TEXT NOT NULL, -- JSON array of strings
    categories JSON,
    min_value DECIMAL(15, 2),
    max_value DECIMAL(15, 2),
    regions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    auto_import_threshold INT DEFAULT 80, -- Auto-import if relevance >= this value
    min_relevance INT DEFAULT 25, -- Minimum relevance required to save the result
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Discovered Tenders Results
CREATE TABLE IF NOT EXISTS tender_scout_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    source_id INT,
    interest_id INT,
    external_id VARCHAR(255), -- Unique ID from the source
    title VARCHAR(500) NOT NULL,
    description TEXT,
    url VARCHAR(500),
    organization VARCHAR(255),
    estimated_value DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'INR',
    deadline DATETIME,
    location VARCHAR(255),
    category VARCHAR(100),
    raw_data JSON, -- Full original data
    matched_keywords JSON,
    ai_summary TEXT,
    relevance_score DECIMAL(5, 2), -- 0.00 to 100.00
    status ENUM('new', 'reviewed', 'imported', 'ignored') DEFAULT 'new',
    imported_tender_id INT,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT,
    FOREIGN KEY (source_id) REFERENCES tender_scout_sources(id),
    FOREIGN KEY (interest_id) REFERENCES tender_scout_interests(id),
    FOREIGN KEY (imported_tender_id) REFERENCES tenders(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_discovered (discovered_at),
    INDEX idx_deadline (deadline),
    INDEX idx_external (external_id),
    UNIQUE KEY unique_external_source (external_id, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Scouting Logs
CREATE TABLE IF NOT EXISTS tender_scout_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source_id INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    status ENUM('running', 'completed', 'failed') DEFAULT 'running',
    tenders_found INT DEFAULT 0,
    tenders_new INT DEFAULT 0,
    error_message TEXT,
    execution_time_ms INT,
    FOREIGN KEY (source_id) REFERENCES tender_scout_sources(id),
    INDEX idx_started (started_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add system config for global scout settings
INSERT INTO system_config (config_key, config_value, config_type, description, updated_by)
VALUES 
('scout_enabled', 'true', 'boolean', 'Enable/disable automated tender scouting', 1),
('scout_frequency', '0 9 * * *', 'string', 'Cron schedule for scouting (default: daily at 9 AM)', 1),
('scout_notification_enabled', 'true', 'boolean', 'Send email notifications for new discoveries', 1)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
