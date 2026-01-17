import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_NAME = process.env.DB_NAME || 'tendertrack_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function testPasswordReset() {
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

    const testEmail = 'ashish.sharma@mobilise.co.in';
    
    // Get user
    const [users] = await connection.query(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [testEmail.toLowerCase()]
    );

    const userArray = users as any[];
    if (userArray.length === 0) {
      console.log('❌ User not found:', testEmail);
      return;
    }

    const user = userArray[0];
    console.log('\n📋 User Information:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Has Password Hash: ${!!user.password_hash}`);
    console.log(`  Password Hash Length: ${user.password_hash?.length || 0}`);
    console.log(`  Password Hash (first 20 chars): ${user.password_hash?.substring(0, 20) || 'N/A'}...`);

    // Test password comparison
    console.log('\n🧪 Testing Password Comparison:');
    const testPasswords = [
      'Test123!@#',
      'Test123!@# ',
      ' Test123!@#',
      ' Test123!@# ',
    ];

    for (const testPwd of testPasswords) {
      const matches = await bcrypt.compare(testPwd, user.password_hash);
      console.log(`  "${testPwd}" (length: ${testPwd.length}): ${matches ? '✅ MATCHES' : '❌ No match'}`);
    }

    // Check recent password updates
    console.log('\n📅 Recent Updates:');
    const [updates] = await connection.query(
      'SELECT updated_at FROM users WHERE id = ?',
      [user.id]
    );
    const updateInfo = (updates as any[])[0];
    console.log(`  Last Updated: ${updateInfo?.updated_at || 'N/A'}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

// Run test
testPasswordReset();













