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

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/add_ai_summary.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Remove comments and split by semicolons
    const cleanedSQL = migrationSQL
      .split('\n')
      .map(line => {
        // Remove single-line comments
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join('\n');
    
    // Split by semicolons and filter out empty statements
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\s*$/));

    console.log(`📊 Executing ${statements.length} SQL statement(s)...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await connection.query(statement + ';');
          if (statement.toUpperCase().includes('ALTER TABLE')) {
            const tableMatch = statement.match(/ALTER\s+TABLE\s+`?(\w+)`?/i);
            if (tableMatch) {
              console.log(`  ✅ Altered table: ${tableMatch[1]}`);
            }
          }
        } catch (err: any) {
          // Ignore "duplicate column" errors (column already exists)
          if (err.message.includes('Duplicate column') || err.message.includes('already exists') || err.code === 'ER_DUP_FIELDNAME') {
            console.log(`  ⚠️  Column already exists, skipping...`);
          } else {
            console.error(`  ❌ Error executing statement ${i + 1}:`, err.message);
            console.error(`  Statement: ${statement.substring(0, 200)}...`);
            throw err; // Re-throw if it's not a duplicate column error
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Note: AI summaries will now be stored in the database.');
    
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

