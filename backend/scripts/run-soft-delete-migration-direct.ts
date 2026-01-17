import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function runMigration() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await connection.query(`USE \`${DB_NAME}\``);
    console.log('✅ Connected to database');

    // Check and add deleted_at to tenders
    const [tendersCols] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenders' AND COLUMN_NAME = 'deleted_at'`
    );
    if ((tendersCols as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE tenders ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at`
      );
      console.log('✅ Added deleted_at to tenders');
    } else {
      console.log('⚠️  deleted_at already exists in tenders');
    }

    // Check and add deleted_by to tenders
    const [tendersCols2] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenders' AND COLUMN_NAME = 'deleted_by'`
    );
    if ((tendersCols2 as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE tenders ADD COLUMN deleted_by INT NULL AFTER deleted_at`
      );
      console.log('✅ Added deleted_by to tenders');
    } else {
      console.log('⚠️  deleted_by already exists in tenders');
    }

    // Check and add index
    const [tendersIdx] = await connection.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenders' AND INDEX_NAME = 'idx_deleted'`
    );
    if ((tendersIdx as any[]).length === 0) {
      await connection.query(`ALTER TABLE tenders ADD INDEX idx_deleted (deleted_at)`);
      console.log('✅ Added idx_deleted index to tenders');
    } else {
      console.log('⚠️  idx_deleted index already exists in tenders');
    }

    // Check and add foreign key
    const [tendersFk] = await connection.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'tenders' AND CONSTRAINT_NAME = 'tenders_ibfk_deleted_by'`
    );
    if ((tendersFk as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE tenders ADD CONSTRAINT tenders_ibfk_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`
      );
      console.log('✅ Added foreign key to tenders');
    } else {
      console.log('⚠️  Foreign key already exists in tenders');
    }

    // Same for documents
    const [docCols] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'deleted_at'`
    );
    if ((docCols as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER uploaded_at`
      );
      console.log('✅ Added deleted_at to documents');
    }

    const [docCols2] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'deleted_by'`
    );
    if ((docCols2 as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE documents ADD COLUMN deleted_by INT NULL AFTER deleted_at`
      );
      console.log('✅ Added deleted_by to documents');
    }

    const [docIdx] = await connection.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND INDEX_NAME = 'idx_deleted'`
    );
    if ((docIdx as any[]).length === 0) {
      await connection.query(`ALTER TABLE documents ADD INDEX idx_deleted (deleted_at)`);
      console.log('✅ Added idx_deleted index to documents');
    }

    const [docFk] = await connection.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND CONSTRAINT_NAME = 'documents_ibfk_deleted_by'`
    );
    if ((docFk as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE documents ADD CONSTRAINT documents_ibfk_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`
      );
      console.log('✅ Added foreign key to documents');
    }

    // Same for tender_activities
    const [actCols] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tender_activities' AND COLUMN_NAME = 'deleted_at'`
    );
    if ((actCols as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE tender_activities ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER created_at`
      );
      console.log('✅ Added deleted_at to tender_activities');
    }

    const [actIdx] = await connection.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tender_activities' AND INDEX_NAME = 'idx_deleted'`
    );
    if ((actIdx as any[]).length === 0) {
      await connection.query(`ALTER TABLE tender_activities ADD INDEX idx_deleted (deleted_at)`);
      console.log('✅ Added idx_deleted index to tender_activities');
    }

    console.log('\n✅ All soft delete migrations completed!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);


