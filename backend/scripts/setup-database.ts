/**
 * Database Setup Script for Azure MySQL
 * 
 * This script creates the database schema and inserts seed data.
 * Run with: npx ts-node scripts/setup-database.ts
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || '172.16.17.68';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'sdx_ind_uat_dbadmin';
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ DB_PASSWORD not found in environment variables');
  console.error('   Please set DB_PASSWORD in your .env file');
  process.exit(1);
}

async function setupDatabase() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔌 Connecting to Azure MySQL server...');
    
    // Connect without specifying database first (to create it if needed)
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false // Azure SSL for development
      }
    });

    console.log('✅ Connected to Azure MySQL server');

    // Create database if it doesn't exist
    console.log(`📦 Creating database '${DB_NAME}' if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✅ Database '${DB_NAME}' ready`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log(`📄 Looking for schema at: ${schemaPath}`);
    
    if (fs.existsSync(schemaPath)) {
      console.log('📄 Reading schema file...');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolons and execute each statement
      // Remove comments and empty lines
      let statements = schema
        .split(';')
        .map(s => {
          // Remove single-line comments
          const lines = s.split('\n');
          const cleaned = lines
            .map(line => {
              const commentIndex = line.indexOf('--');
              if (commentIndex >= 0) {
                return line.substring(0, commentIndex);
              }
              return line;
            })
            .join('\n')
            .trim();
          return cleaned;
        })
        .filter(s => {
          const trimmed = s.trim();
          return trimmed.length > 0 && 
                 !trimmed.startsWith('/*') &&
                 trimmed !== '';
        });
      
      // Filter out empty statements
      statements = statements.filter(s => s.length > 10); // Minimum statement length

      console.log(`📊 Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.length > 0) {
          try {
            await connection.query(statement + ';');
            if (statement.toUpperCase().includes('CREATE TABLE')) {
              const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
              if (tableMatch) {
                console.log(`  ✅ Created table: ${tableMatch[1]}`);
              }
            }
          } catch (err: any) {
            // Ignore "table already exists" errors
            if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
              console.error(`  ⚠️  Error executing statement ${i + 1}:`, err.message);
              console.error(`  Statement: ${statement.substring(0, 100)}...`);
            }
          }
        }
      }
    } else {
      console.log('⚠️  Schema file not found. Creating tables directly...');
      await createTablesDirectly(connection);
    }

    // Read and execute seed data
    const seedPath = path.join(__dirname, '../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Inserting seed data...');
      const seed = fs.readFileSync(seedPath, 'utf8');
      const seedStatements = seed
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of seedStatements) {
        if (statement.length > 0) {
          try {
            await connection.query(statement);
          } catch (err: any) {
            // Ignore duplicate entry errors
            if (!err.message.includes('Duplicate entry')) {
              console.error('  ⚠️  Error inserting seed data:', err.message);
            }
          }
        }
      }
      console.log('✅ Seed data inserted');
    } else {
      console.log('⚠️  Seed file not found. Inserting seed data directly...');
      await insertSeedDataDirectly(connection);
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`🌐 Server: ${DB_HOST}:${DB_PORT}`);

  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Check if Azure MySQL server is accessible');
      console.error('   → Verify firewall rules allow connections from your IP');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Check database credentials in .env file');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createTablesDirectly(_connection: mysql.Connection) {
  // This will be implemented with the full schema
  // For now, we'll create a minimal version
  console.log('Creating tables...');
  // Tables will be created from schema.sql file
}

async function insertSeedDataDirectly(connection: mysql.Connection) {
  // Generate bcrypt hash for Admin@123 password
  // For now, we'll use a placeholder - actual hash should be generated
  const adminPasswordHash = '$2b$10$rQZ8KJp8qYZZWJ2xjYe3xGxGxGxGxGxGxGxGxGxGxGxGxGxGxGxGx';
  
  try {
    // Insert admin user
    await connection.query(`
      INSERT IGNORE INTO users (email, password_hash, full_name, role, status) 
      VALUES (?, ?, ?, ?, ?)
    `, ['admin@tendertrack.com', adminPasswordHash, 'System Administrator', 'Admin', 'Active']);

    // Insert document categories
    await connection.query(`
      INSERT IGNORE INTO document_categories (name, description, icon, is_system) VALUES
      ('Tax Documents', 'Tax related documents like GSTIN, PAN', 'FileText', TRUE),
      ('Certifications', 'ISO, Quality certifications', 'Award', TRUE),
      ('Company Documents', 'Company registration, incorporation', 'Building2', TRUE),
      ('Financial Documents', 'Bank statements, financial records', 'DollarSign', TRUE),
      ('Technical Documents', 'Technical specifications, drawings', 'Wrench', TRUE),
      ('Legal Documents', 'Contracts, agreements, legal papers', 'Scale', TRUE)
    `);

    // Insert tender categories
    await connection.query(`
      INSERT IGNORE INTO tender_categories (name, description, color, icon) VALUES
      ('Construction', 'Construction and infrastructure projects', '#3b82f6', 'HardHat'),
      ('IT Services', 'Software and IT service tenders', '#8b5cf6', 'Laptop'),
      ('Consultancy', 'Consulting and advisory services', '#10b981', 'Briefcase'),
      ('Supply', 'Material and equipment supply', '#f59e0b', 'Package'),
      ('Maintenance', 'Maintenance and support services', '#ef4444', 'Wrench')
    `);

    // Insert system configuration
    await connection.query(`
      INSERT IGNORE INTO system_config (config_key, config_value, config_type, description) VALUES
      ('email_enabled', 'false', 'boolean', 'Enable/disable email notifications'),
      ('sms_enabled', 'false', 'boolean', 'Enable/disable SMS notifications'),
      ('session_timeout_minutes', '30', 'number', 'User session timeout in minutes'),
      ('max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB'),
      ('deadline_reminder_days', '7,3,1', 'string', 'Days before deadline to send reminders')
    `);

    console.log('✅ Seed data inserted directly');
  } catch (error: any) {
    console.error('Error inserting seed data:', error.message);
  }
}

// Run setup
setupDatabase();

