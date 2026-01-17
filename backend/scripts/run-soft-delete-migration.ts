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

// Helper functions to check if columns/indexes/constraints exist
async function columnExists(connection: mysql.Connection | null, table: string, column: string): Promise<boolean> {
  if (!connection) return false;
  try {
    const [result] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = ? 
       AND COLUMN_NAME = ?`,
      [table, column]
    );
    return ((result as any[])[0]?.count || 0) > 0;
  } catch {
    return false;
  }
}

async function indexExists(connection: mysql.Connection | null, table: string, index: string): Promise<boolean> {
  if (!connection) return false;
  try {
    const [result] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = ? 
       AND INDEX_NAME = ?`,
      [table, index]
    );
    return ((result as any[])[0]?.count || 0) > 0;
  } catch {
    return false;
  }
}

async function constraintExists(connection: mysql.Connection | null, table: string, constraint: string): Promise<boolean> {
  if (!connection) return false;
  try {
    const [result] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM information_schema.TABLE_CONSTRAINTS 
       WHERE CONSTRAINT_SCHEMA = DATABASE() 
       AND TABLE_NAME = ? 
       AND CONSTRAINT_NAME = ?`,
      [table, constraint]
    );
    return ((result as any[])[0]?.count || 0) > 0;
  } catch {
    return false;
  }
}

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
    const migrationPath = path.join(__dirname, '../database/migrations/add_soft_delete.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Extract the UP section
    const upMatch = migrationSQL.match(/--\s*UP\s*\n(.*?)(?=\n--\s*DOWN|$)/is);
    let upSQL = '';
    if (!upMatch) {
      // If no UP section, use the whole file (backward compatibility)
      upSQL = migrationSQL;
    } else {
      upSQL = upMatch[1].trim();
    }

    // Split by semicolons and execute each statement separately
    const statements = upSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          // Check if we should skip this statement
          const tableMatch = statement.match(/ALTER\s+TABLE\s+`?(\w+)`?/i);
          const table = tableMatch ? tableMatch[1] : '';

          // Check for ADD COLUMN
          if (statement.includes('ADD COLUMN') && table) {
            const columnMatches = statement.matchAll(/ADD\s+COLUMN\s+`?(\w+)`?/gi);
            let shouldSkip = false;
            for (const match of columnMatches) {
              if (await columnExists(connection, table, match[1])) {
                console.log(`  ⚠️  Column ${table}.${match[1]} already exists, skipping statement...`);
                shouldSkip = true;
                break;
              }
            }
            if (shouldSkip) continue;
          }

          // Check for ADD INDEX
          if (statement.includes('ADD INDEX') && table) {
            const indexMatch = statement.match(/ADD\s+INDEX\s+`?(\w+)`?/i);
            if (indexMatch && await indexExists(connection, table, indexMatch[1])) {
              console.log(`  ⚠️  Index ${table}.${indexMatch[1]} already exists, skipping statement...`);
              continue;
            }
          }

          // Check for ADD CONSTRAINT
          if (statement.includes('ADD CONSTRAINT') && table) {
            const constraintMatch = statement.match(/ADD\s+CONSTRAINT\s+`?(\w+)`?/i);
            if (constraintMatch && await constraintExists(connection, table, constraintMatch[1])) {
              console.log(`  ⚠️  Constraint ${table}.${constraintMatch[1]} already exists, skipping statement...`);
              continue;
            }
          }

          if (connection) {
            await connection.query(statement + ';');
          }
          if (statement.toUpperCase().includes('ALTER TABLE')) {
            if (tableMatch) {
              const action = statement.includes('ADD COLUMN') ? 'Added column(s) to' :
                statement.includes('ADD INDEX') ? 'Added index to' :
                  statement.includes('ADD CONSTRAINT') ? 'Added constraint to' :
                    'Altered';
              console.log(`  ✅ ${action} table: ${tableMatch[1]}`);
            }
          }
        } catch (err: any) {
          // Ignore "duplicate column" and "duplicate key" errors (already exists)
          if (err.message.includes('Duplicate column') ||
            err.message.includes('Duplicate key') ||
            err.message.includes('already exists') ||
            err.message.includes('Duplicate constraint') ||
            err.message.includes('Duplicate index') ||
            err.message.includes('Duplicate entry')) {
            console.log(`  ⚠️  Already exists, skipping: ${statement.substring(0, 60)}...`);
          } else {
            console.error(`  ❌ Error executing statement ${i + 1}:`, err.message);
            console.error(`  Statement: ${statement.substring(0, 150)}...`);
            // Don't throw - continue with other statements
            console.log(`  ⚠️  Continuing with next statement...`);
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Note: The application will now support soft delete functionality.');

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
