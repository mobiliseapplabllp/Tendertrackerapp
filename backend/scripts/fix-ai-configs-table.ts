import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function fixTable() {
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

    // Check current table structure
    console.log('📊 Checking table structure...');
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ai_api_configs'
       ORDER BY ORDINAL_POSITION`,
      [DB_NAME]
    ) as any[];

    console.log('Current columns:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
    });

    // Check if api_key_encrypted column exists
    const hasApiKeyColumn = columns.some((col: any) => col.COLUMN_NAME === 'api_key_encrypted');
    
    if (!hasApiKeyColumn) {
      console.log('\n⚠️  Column api_key_encrypted not found. Adding it...');
      
      // Check if there's an api_key column (without _encrypted)
      const hasApiKey = columns.some((col: any) => col.COLUMN_NAME === 'api_key');
      
      if (hasApiKey) {
        // Rename existing api_key to api_key_encrypted
        console.log('  Renaming api_key to api_key_encrypted...');
        await connection.query(
          `ALTER TABLE ai_api_configs CHANGE COLUMN api_key api_key_encrypted TEXT NOT NULL`
        );
        console.log('  ✅ Column renamed');
      } else {
        // Add new column
        console.log('  Adding api_key_encrypted column...');
        await connection.query(
          `ALTER TABLE ai_api_configs ADD COLUMN api_key_encrypted TEXT NOT NULL AFTER model_name`
        );
        console.log('  ✅ Column added');
      }
    } else {
      console.log('\n✅ Column api_key_encrypted already exists');
    }

    // Verify final structure
    console.log('\n📊 Final table structure:');
    const [finalColumns] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ai_api_configs'
       ORDER BY ORDINAL_POSITION`,
      [DB_NAME]
    ) as any[];

    finalColumns.forEach((col: any) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
    });

    console.log('\n✅ Table structure fixed successfully!');
    
  } catch (error: any) {
    console.error('❌ Error fixing table:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

// Run fix
fixTable();


