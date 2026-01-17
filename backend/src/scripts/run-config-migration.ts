// Script to run configuration migration
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables BEFORE importing database
dotenv.config({ path: path.join(__dirname, '../../.env') });

import pool from '../config/database';

async function runMigration() {
    console.log('Connecting to database...');
    const connection = await pool.getConnection();

    try {
        console.log('✅ Connected to database');
        console.log('Running configuration tables migration...');

        const migrationPath = path.join(__dirname, '../../database/migrations/012_add_configuration_tables.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Remove comments and split by semicolon, but keep multi-line statements together
        const cleanedSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments

        // Split by semicolon but only when it's at the end of a statement
        const statements: string[] = [];
        let currentStatement = '';

        for (const line of cleanedSql.split('\n')) {
            currentStatement += line + '\n';
            if (line.trim().endsWith(';')) {
                const stmt = currentStatement.trim();
                if (stmt.length > 1) { // More than just semicolon
                    statements.push(stmt);
                }
                currentStatement = '';
            }
        }

        console.log(`Executing ${statements.length} SQL statements...`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                await connection.query(statement);
                console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
            } catch (err: any) {
                // Ignore specific errors
                if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`⚠ Statement ${i + 1}: Table already exists, skipping`);
                } else if (err.code === 'ER_DUP_KEYNAME') {
                    console.log(`⚠ Statement ${i + 1}: Index already exists, skipping`);
                } else if (err.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠ Statement ${i + 1}: Duplicate entry, skipping`);
                } else {
                    console.error(`❌ Error in statement ${i + 1}:`, statement.substring(0, 100));
                    throw err;
                }
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('Created tables: system_settings, dropdown_options');
        console.log('Seeded initial data');

        connection.release();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        console.error('Error code:', error.code);
        connection.release();
        process.exit(1);
    }
}

runMigration();
