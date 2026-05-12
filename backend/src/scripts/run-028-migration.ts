import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import pool from '../config/database';

async function run() {
    const connection = await pool.getConnection();
    try {
        console.log('Adding Task to activity_type ENUM...');
        await connection.query(`
            ALTER TABLE tender_activities
              MODIFY COLUMN activity_type
                ENUM('Created', 'Updated', 'Commented', 'Status Changed', 'Document Added', 'Assigned', 'Deadline Changed', 'Task')
                NOT NULL
        `);
        console.log('Done.');
        connection.release();
        process.exit(0);
    } catch (err: any) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            console.log('Table tender_activities not found — skipping.');
            connection.release();
            process.exit(0);
        }
        console.error('Migration failed:', err.message);
        connection.release();
        process.exit(1);
    }
}

run();
