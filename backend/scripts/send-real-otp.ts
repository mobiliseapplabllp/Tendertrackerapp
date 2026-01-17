import dotenv from 'dotenv';
import path from 'path';
import db from '../src/config/database';
import { OTPService } from '../src/services/otpService';
import { emailService } from '../src/services/emailService';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function sendRealOTP() {
  const email = 'ashish.sharma@mobilise.co.in';
  
  try {
    // Find user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    
    const userArray = users as any[];
    if (userArray.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }
    
    const user = userArray[0];
    console.log(`✅ Found user: ${user.full_name} (ID: ${user.id})`);
    
    // Generate OTP
    const otp = OTPService.generateOTP();
    console.log(`🔐 Generated OTP: ${otp}`);
    
    // Store OTP
    await OTPService.storeOTP(user.id, otp, '127.0.0.1');
    console.log('💾 OTP stored in database');
    
    // Send OTP via email
    await emailService.sendOTP(user.email, otp, user.full_name);
    console.log('📧 OTP email sent successfully!');
    console.log(`📬 Please check your inbox at ${email}`);
    console.log(`🔑 Your OTP code is: ${otp}`);
    console.log('⏰ This OTP will expire in 10 minutes');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.body) {
      console.error('SendGrid Response:', JSON.stringify(error.response.body, null, 2));
    }
  }
  
  process.exit(0);
}

sendRealOTP();
