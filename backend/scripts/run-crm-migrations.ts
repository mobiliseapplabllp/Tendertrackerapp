/**
 * CRM Migration Runner
 * 
 * This script runs all CRM-related migrations in the correct order.
 * Run this after the base schema is applied.
 * 
 * Usage:
 *   npx ts-node backend/scripts/run-crm-migrations.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

interface Migration {
  name: string;
  file: string;
  order: number;
}

const CRM_MIGRATIONS: Migration[] = [
  { name: 'Add Lead Types', file: '004_add_lead_types.sql', order: 4 },
  { name: 'Add Sales Stages', file: '005_add_sales_stages.sql', order: 5 },
  { name: 'Add Activity Types', file: '006_add_activity_types.sql', order: 6 },
  { name: 'Add CRM Columns to Tenders', file: '010_add_crm_columns_to_tenders.sql', order: 10 },
  { name: 'Set Default CRM Values', file: '011_set_default_crm_values.sql', order: 11 },
  // Note: 009_add_deals_table.sql requires 'leads' table which is created in 007_rename_tenders_to_leads.sql
  // Run deals table migration after table renames
  // { name: 'Add Deals Table', file: '009_add_deals_table.sql', order: 9 },
];

const TABLE_RENAME_MIGRATIONS: Migration[] = [
  { name: 'Rename Tenders to Leads', file: '007_rename_tenders_to_leads.sql', order: 7 },
  { name: 'Rename Tender Tables', file: '008_rename_tender_tables.sql', order: 8 },
];

async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tendertrack',
    multipleStatements: true,
  });
  return connection;
}

async function readMigrationFile(filename: string): Promise<string> {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

async function extractUpMigration(sql: string): Promise<string> {
  // Extract the UP section
  const upMatch = sql.match(/--\s*UP\s*\n(.*?)(?=\n--\s*DOWN|$)/is);
  if (!upMatch) {
    throw new Error('UP section not found in migration file');
  }
  return upMatch[1].trim();
}

async function runMigration(connection: mysql.Connection, migration: Migration) {
  console.log(`\n📦 Running migration: ${migration.name} (${migration.file})`);
  
  try {
    const sql = await readMigrationFile(migration.file);
    const upSql = await extractUpMigration(sql);
    
    await connection.query(upSql);
    console.log(`✅ Migration ${migration.name} completed successfully`);
  } catch (error: any) {
    console.error(`❌ Error running migration ${migration.name}:`, error.message);
    throw error;
  }
}

async function runSafeMigrations() {
  console.log('🚀 Starting CRM Safe Migrations...\n');
  
  const connection = await getConnection();
  
  try {
    for (const migration of CRM_MIGRATIONS) {
      await runMigration(connection, migration);
    }
    
    console.log('\n✅ All safe migrations completed successfully!');
    console.log('\n⚠️  Next steps:');
    console.log('   1. Test your application with the new CRM features');
    console.log('   2. When ready, run table rename migrations separately:');
    console.log('      - 007_rename_tenders_to_leads.sql');
    console.log('      - 008_rename_tender_tables.sql');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

async function runTableRenameMigrations() {
  console.log('🚀 Starting Table Rename Migrations...\n');
  console.log('⚠️  WARNING: This will rename tables. Make sure you have a backup!\n');
  
  const connection = await getConnection();
  
  try {
    for (const migration of TABLE_RENAME_MIGRATIONS) {
      await runMigration(connection, migration);
    }
    
    console.log('\n✅ All table rename migrations completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0] || 'safe';

if (command === 'safe') {
  runSafeMigrations();
} else if (command === 'rename') {
  runTableRenameMigrations();
} else {
  console.log('Usage:');
  console.log('  npx ts-node backend/scripts/run-crm-migrations.ts [safe|rename]');
  console.log('');
  console.log('  safe   - Run safe migrations (004, 005, 006, 009)');
  console.log('  rename - Run table rename migrations (007, 008)');
  process.exit(1);
}

