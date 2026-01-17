import db from '../src/config/database';



async function runMigration() {
    try {
        console.log('Starting migration for matched_keywords and min_relevance...');

        // 1. Check and add min_relevance to tender_scout_interests
        const [columns1] = await db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'tender_scout_interests' 
             AND COLUMN_NAME = 'min_relevance'`
        );

        if ((columns1 as any[]).length === 0) {
            console.log('Adding min_relevance column...');
            await db.query(`ALTER TABLE tender_scout_interests ADD COLUMN min_relevance INT DEFAULT 25 AFTER auto_import_threshold`);
        } else {
            console.log('Column min_relevance already exists.');
        }

        // 2. Check and add matched_keywords to tender_scout_results
        const [columns2] = await db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'tender_scout_results' 
             AND COLUMN_NAME = 'matched_keywords'`
        );

        if ((columns2 as any[]).length === 0) {
            console.log('Adding matched_keywords column...');
            await db.query(`ALTER TABLE tender_scout_results ADD COLUMN matched_keywords JSON AFTER raw_data`);
        } else {
            console.log('Column matched_keywords already exists.');
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
