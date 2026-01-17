import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function seedTenderScout() {
    let connection: mysql.Connection | null = null;

    try {
        console.log('🌱 Seeding Tender Scout data...');

        connection = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
        });

        console.log('✅ Connected to database');

        // Get admin user ID
        const [users] = await connection.query(
            "SELECT id FROM users WHERE role = 'Admin' LIMIT 1"
        );
        const adminId = (users as any[])[0]?.id || 1;

        // Check if interest already exists
        const [existingInterests] = await connection.query(
            "SELECT id FROM tender_scout_interests WHERE name = 'Mobilise SaaS Opportunities'"
        );

        if ((existingInterests as any[]).length === 0) {
            await connection.query(
                `INSERT INTO tender_scout_interests 
        (user_id, name, keywords, categories, min_value, max_value, regions, is_active, auto_import_threshold)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    adminId,
                    'Mobilise SaaS Opportunities',
                    JSON.stringify([
                        'Fixed Asset Management',
                        'Enterprise Asset Management',
                        'EAM',
                        'Complaint Management System',
                        'Digital Log Book',
                        'Supply Chain Management',
                        'SCM',
                        'IT Application Development',
                        'SaaS',
                        'IFMS',
                        'HRMS',
                        'School ERP',
                        'University ERP',
                        'Single Sign On',
                        'SSO',
                        'IoT Management'
                    ]),
                    JSON.stringify(['IT Services', 'Software Development', 'Consultancy']),
                    100000,
                    50000000,
                    JSON.stringify(['India']),
                    true,
                    80
                ]
            );
            console.log('✅ Created Mobilise SaaS interest profile');
        } else {
            console.log('⚠️  Mobilise interest profile already exists');
        }

        // Check if Google search source exists
        const [existingSources] = await connection.query(
            "SELECT id FROM tender_scout_sources WHERE name = 'Google India Gov Tenders'"
        );

        if ((existingSources as any[]).length === 0) {
            await connection.query(
                `INSERT INTO tender_scout_sources 
        (name, source_type, url, is_active, scraping_config, created_by)
        VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    'Google India Gov Tenders',
                    'google_search',
                    'https://www.googleapis.com/customsearch/v1',
                    true,
                    JSON.stringify({
                        description: 'Searches Indian government websites for tender opportunities'
                    }),
                    adminId
                ]
            );
            console.log('✅ Created Google search source');
        } else {
            console.log('⚠️  Google search source already exists');
        }

        console.log('✅ Tender Scout seeding completed!');
    } catch (error: any) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

seedTenderScout();
