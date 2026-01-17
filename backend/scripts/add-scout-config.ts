import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function addScoutConfig() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '172.16.17.68',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'sdx_ind_uat_dbadmin',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tendertrack_db',
    });

    console.log('✅ Connected to database');

    try {
        // Add Google API config entries
        await connection.query(`
      INSERT INTO system_config (config_key, config_value, config_type, description, is_encrypted, updated_by)
      VALUES 
      ('google_search_api_key', '', 'string', 'Google Custom Search API Key for Tender Scout', TRUE, 1),
      ('google_search_engine_id', '', 'string', 'Google Custom Search Engine ID for Tender Scout', FALSE, 1)
      ON DUPLICATE KEY UPDATE config_key=config_key
    `);
        console.log('✅ Added Google API config entries');

        console.log('🎉 Scout configuration added successfully!');
    } finally {
        await connection.end();
    }
}

addScoutConfig().catch(console.error);
