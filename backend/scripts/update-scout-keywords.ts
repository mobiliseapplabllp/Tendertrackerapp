import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function updateScoutKeywords() {
    let connection;

    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'tendertrack_db',
        });

        console.log('✓ Connected to database');

        // Update keywords with broader terms
        const updateQuery = `
      UPDATE tender_scout_interests 
      SET keywords = ?,
          categories = ?,
          regions = ?
      WHERE name = 'Mobilise SaaS Opportunities' AND is_active = 1
    `;

        const keywords = JSON.stringify([
            "software development",
            "IT services",
            "web application",
            "mobile application",
            "cloud services",
            "digital transformation",
            "ERP",
            "enterprise software",
            "government IT",
            "smart city",
            "e-governance",
            "IT infrastructure",
            "application development",
            "software solution",
            "technology services",
            "IT consultancy",
            "system integration",
            "database management",
            "network services",
            "cybersecurity"
        ]);

        const categories = JSON.stringify([
            "IT Services",
            "Software Development",
            "Cloud Computing",
            "Digital Services",
            "Technology Consulting"
        ]);

        const regions = JSON.stringify([
            "India",
            "Maharashtra",
            "Delhi",
            "Karnataka",
            "Gujarat",
            "Tamil Nadu"
        ]);

        const [result] = await connection.execute(updateQuery, [keywords, categories, regions]);

        console.log('✓ Keywords updated successfully!');
        console.log(`  Rows affected: ${result.affectedRows}`);
        console.log('\n📋 Updated with:');
        console.log('  - 20 broader keywords');
        console.log('  - 5 categories');
        console.log('  - 6 regions');
        console.log('\n🎯 Next steps:');
        console.log('  1. Refresh Scout Configuration page to see new keywords');
        console.log('  2. Go to Tender Scout page');
        console.log('  3. Click "Run Scout Now"');
        console.log('  4. You should now see tenders discovered! 🎉');

    } catch (error) {
        console.error('✗ Error updating keywords:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✓ Database connection closed');
        }
    }
}

updateScoutKeywords();
