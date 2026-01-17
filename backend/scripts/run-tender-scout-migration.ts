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
    });

    console.log('✅ Connected to MySQL server');
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✅ Using database '${DB_NAME}'`);

    // Check if table already exists
    const [tables] = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tender_scout_sources'`,
      [DB_NAME]
    ) as any[];

    if (tables.length > 0) {
      console.log('⚠️  Table tender_scout_sources already exists. Skipping migration.');
      process.exit(0);
    }

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/add_tender_scout.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await connection.query(statement + ';');
          
          // Log table creation
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
            if (tableMatch) {
              console.log(`  ✅ Created table: ${tableMatch[1]}`);
            }
          }
          // Log insert
          else if (statement.toUpperCase().includes('INSERT INTO')) {
             console.log(`  ✅ Inserted default configuration`);
          }
          
        } catch (err: any) {
          // Ignore "table already exists" errors
          if (err.message.includes('already exists')) {
            console.log(`  ⚠️  Table already exists, skipping...`);
          } else {
            console.error(`  ❌ Error executing statement ${i + 1}:`, err.message);
            console.error(`  Statement: ${statement.substring(0, 100)}...`);
            throw err;
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Note: Tender Scout tables and configuration have been added.');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

// Run migration
runMigration();
