/**
 * Database Backup Script
 * 
 * Creates a backup of the database.
 * Run with: npx ts-node scripts/backup-database.ts
 */

import mysql from 'mysql2/promise';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const execAsync = promisify(exec);

const DB_HOST = process.env.DB_HOST || '172.16.17.68';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'sdx_ind_uat_dbadmin';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

const BACKUP_DIR = path.join(__dirname, '../backups');

async function backupDatabase() {
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupFile = path.join(BACKUP_DIR, `tendertrack_db_${timestamp}.sql`);

  console.log(`📦 Creating backup: ${backupFile}`);

  try {
    // Use mysqldump for backup
    const command = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${backupFile}`;
    
    await execAsync(command);

    // Compress backup
    const compressedFile = `${backupFile}.gz`;
    await execAsync(`gzip ${backupFile}`);

    console.log(`✅ Backup created: ${compressedFile}`);

    // Clean up old backups (keep last 30 days)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql.gz'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    for (const file of files) {
      if (file.time < thirtyDaysAgo) {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      }
    }

    console.log(`📊 Total backups: ${files.length}`);
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupDatabase();

