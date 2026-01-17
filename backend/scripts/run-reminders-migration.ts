import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function runMigration() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔌 Connecting to MySQL server...');
    
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL server');
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✅ Using database '${DB_NAME}'`);

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/add_work_log_reminders.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📊 Executing migration SQL...');
    
    // Execute migration
    await connection.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('Created tables: work_log_reminders, work_log_reminder_recipients, work_log_reminder_sent');
    console.log('\n📝 Note: The application now supports work log reminders with email and SMS notifications.');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
      console.log('⚠️  Tables may already exist. This is safe to ignore.');
    } else {
      console.error('Full error:', error);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

// Run migration
runMigration();

