
import db from '../src/config/database';
import logger from '../src/utils/logger';

async function runMigration() {
    try {
        logger.info('Starting lead_activities table creation...');

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS lead_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        user_id INT NOT NULL,
        activity_type ENUM('Call', 'Meeting', 'Email', 'Task', 'Note', 'Status Changed') NOT NULL,
        subject VARCHAR(255),
        description TEXT,
        activity_date DATETIME,
        duration_minutes INT,
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES tenders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

        await db.query(createTableQuery);

        logger.info('lead_activities table created successfully (or already exists).');
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
