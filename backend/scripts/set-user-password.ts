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

async function setUserPassword() {
  let connection: mysql.Connection | null = null;

  try {
    const email = 'ashish.sharma@mobilise.co.in';
    const newPassword = 'Mobilise@12345!';

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
      'SELECT id, email, full_name FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    const userArray = users as any[];
    if (userArray.length === 0) {
      console.log('❌ User not found:', email);
      return;
    }

    const user = userArray[0];
    console.log('\n📋 User Information:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Full Name: ${user.full_name}`);

    // Hash the new password
    console.log('\n🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS || '10')
    );
    console.log('✅ Password hashed');

    // Update password
    console.log('\n💾 Updating password in database...');
    const [updateResult] = await connection.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [passwordHash, user.id]
    );

    const updateInfo = updateResult as any;
    if (updateInfo.affectedRows === 0) {
      console.log('❌ Password update failed - no rows affected');
      return;
    }

    console.log('✅ Password updated successfully');

    // Verify the password was actually updated by checking it
    console.log('\n🔍 Verifying password update...');
    const [verifyUsers] = await connection.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [user.id]
    );
    const verifyUser = (verifyUsers as any[])[0];
    const passwordMatches = await bcrypt.compare(newPassword, verifyUser.password_hash);
    
    if (!passwordMatches) {
      console.log('❌ Password verification failed - hash mismatch');
      return;
    }

    console.log('✅ Password verification successful');
    console.log('\n🎉 Password has been set successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n📝 You can now login with these credentials.');

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

// Run script
setUserPassword();













