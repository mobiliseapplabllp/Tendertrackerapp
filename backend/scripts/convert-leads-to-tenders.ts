
import db from '../src/config/database';
import logger from '../src/utils/logger';

async function runMigration() {
    try {
        logger.info('Starting migration: Convert all leads to tenders...');

        // Assuming lead_type_id = 1 is Tender, as per previous context
        const TENDER_TYPE_ID = 1;

        const [result] = await db.query(
            'UPDATE tenders SET lead_type_id = ?',
            [TENDER_TYPE_ID]
        );

        logger.info(`Migration completed successfully. Updated ${(result as any).affectedRows} records.`);
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
