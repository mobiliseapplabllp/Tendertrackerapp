/**
 * Database Migration Script
 * 
 * This script handles database migrations with version control.
 * Run with: npx ts-node scripts/migrate.ts [up|down] [version]
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || '172.16.17.68';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'sdx_ind_uat_dbadmin';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

interface Migration {
  version: string;
  up: string;
  down: string;
}

async function getMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(__dirname, '../database/migrations');
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const migrations: Migration[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const parts = content.split('-- DOWN');
    
    if (parts.length === 2) {
      migrations.push({
        version: file.replace('.sql', ''),
        up: parts[0].replace('-- UP', '').trim(),
        down: parts[1].trim(),
      });
    }
  }

  return migrations;
}

async function getCurrentVersion(connection: mysql.Connection): Promise<string | null> {
  try {
    const [rows] = await connection.query(
      "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"
    );
    const result = rows as any[];
    return result.length > 0 ? result[0].version : null;
  } catch (error: any) {
    if (error.message.includes("doesn't exist")) {
      // Create migrations table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return null;
    }
    throw error;
  }
}

async function migrateUp(connection: mysql.Connection, targetVersion?: string) {
  const migrations = await getMigrations();
  const currentVersion = await getCurrentVersion(connection);

  for (const migration of migrations) {
    if (targetVersion && migration.version > targetVersion) {
      break;
    }
    if (!currentVersion || migration.version > currentVersion) {
      console.log(`Applying migration ${migration.version}...`);
      await connection.query(migration.up);
      await connection.query(
        'INSERT INTO schema_migrations (version) VALUES (?)',
        [migration.version]
      );
      console.log(`✅ Migration ${migration.version} applied`);
    }
  }
}

async function migrateDown(connection: mysql.Connection, targetVersion: string) {
  const migrations = await getMigrations();
  const currentVersion = await getCurrentVersion(connection);

  if (!currentVersion) {
    console.log('No migrations to rollback');
    return;
  }

  const sortedMigrations = migrations.sort((a, b) => b.version.localeCompare(a.version));

  for (const migration of sortedMigrations) {
    if (migration.version <= targetVersion) {
      break;
    }
    if (migration.version <= currentVersion) {
      console.log(`Rolling back migration ${migration.version}...`);
      await connection.query(migration.down);
      await connection.query(
        'DELETE FROM schema_migrations WHERE version = ?',
        [migration.version]
      );
      console.log(`✅ Migration ${migration.version} rolled back`);
    }
  }
}

async function main() {
  const command = process.argv[2] || 'up';
  const targetVersion = process.argv[3];

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: { rejectUnauthorized: false },
    });

    await connection.query(`USE \`${DB_NAME}\``);

    if (command === 'up') {
      await migrateUp(connection, targetVersion);
    } else if (command === 'down') {
      if (!targetVersion) {
        console.error('Target version required for rollback');
        process.exit(1);
      }
      await migrateDown(connection, targetVersion);
    } else {
      console.error('Invalid command. Use "up" or "down"');
      process.exit(1);
    }

    console.log('✅ Migration completed');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();

