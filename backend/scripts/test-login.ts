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

async function testLogin() {
  let connection: mysql.Connection | null = null;

  try {
    const email = 'ashish.sharma@mobilise.co.in';
    const password = 'Mobilise@12345!';

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

    // Get user
    const [users] = await connection.query(
      'SELECT * FROM users WHERE email = ? AND status = ?',
      [email.toLowerCase(), 'Active']
    );

    const userArray = users as any[];
    if (userArray.length === 0) {
      console.log('❌ User not found or not active:', email);
      return;
    }

    const user = userArray[0];
    console.log('\n📋 User Information:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Full Name: ${user.full_name}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Has Password Hash: ${!!user.password_hash}`);
    console.log(`  Password Hash Length: ${user.password_hash?.length || 0}`);
    console.log(`  Password Hash (first 20 chars): ${user.password_hash?.substring(0, 20) || 'N/A'}...`);

    // Test password comparison
    console.log('\n🧪 Testing Password Comparison:');
    const testPasswords = [
      password,
      password.trim(),
      ' ' + password,
      password + ' ',
      ' ' + password + ' ',
    ];

    for (const testPwd of testPasswords) {
      const matches = await bcrypt.compare(testPwd, user.password_hash);
      console.log(`  "${testPwd}" (length: ${testPwd.length}): ${matches ? '✅ MATCHES' : '❌ No match'}`);
    }

    // Test with trimmed password (as per login code)
    console.log('\n🔍 Testing with trimmed password (as per login code):');
    const trimmedPassword = password.trim();
    const isValidPassword = await bcrypt.compare(trimmedPassword, user.password_hash);
    console.log(`  Trimmed password matches: ${isValidPassword ? '✅ YES' : '❌ NO'}`);

    if (!isValidPassword) {
      console.log('\n❌ Password comparison failed!');
      console.log('   This means the password in the database does not match the expected password.');
      console.log('   The password may have been set incorrectly or the hash is corrupted.');
    } else {
      console.log('\n✅ Password comparison successful!');
      console.log('   The password should work for login.');
    }

    // Check recent password updates
    console.log('\n📅 Recent Updates:');
    const [updates] = await connection.query(
      'SELECT updated_at FROM users WHERE id = ?',
      [user.id]
    );
    const updateInfo = (updates as any[])[0];
    console.log(`  Last Updated: ${updateInfo?.updated_at || 'N/A'}`);

    // Check if 2FA is enabled
    console.log('\n🔐 Checking 2FA Settings:');
    const [config] = await connection.query(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      ['two_factor_enabled']
    );
    const configArray = config as any[];
    const twoFactorEnabled = configArray.length > 0 && configArray[0].config_value === 'true';
    console.log(`  2FA Enabled: ${twoFactorEnabled ? '✅ YES' : '❌ NO'}`);
    if (twoFactorEnabled) {
      console.log('  ⚠️  2FA is enabled - login will require OTP after password verification');
    }

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
testLogin();













