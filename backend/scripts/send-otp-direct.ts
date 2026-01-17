import dotenv from 'dotenv';
import path from 'path';
import sgMail from '@sendgrid/mail';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function sendOTPDirect() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error('❌ SENDGRID_API_KEY not found in .env');
    process.exit(1);
  }

  sgMail.setApiKey(apiKey);
  
  // Try using your actual email as the "from" address (must be verified in SendGrid)
  const fromEmail = process.env.SENDGRID_VERIFIED_EMAIL || 'ashish.sharma@mobilise.co.in';
  const toEmail = 'ashish.sharma@mobilise.co.in';
  const testOTP = '123456';
  
  console.log(`📧 Sending OTP email...`);
  console.log(`From: ${fromEmail}`);
  console.log(`To: ${toEmail}`);
  console.log(`OTP: ${testOTP}`);
  console.log('');

  try {
    const msg = {
      to: toEmail,
      from: {
        email: fromEmail,
        name: 'LeadTrack Pro',
      },
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">LeadTrack Pro</h1>
          </div>
          <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Login Verification Code</h2>
            <p style="color: #4b5563; font-size: 16px;">Hello,</p>
            <p style="color: #4b5563; font-size: 16px;">Your verification code is:</p>
            <div style="background-color: #f3f4f6; padding: 25px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 30px 0; border-radius: 8px; color: #1f2937;">
              ${testOTP}
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `,
      text: `Your login verification code is: ${testOTP}. This code will expire in 10 minutes.`,
    };

    await sgMail.send(msg);
    console.log('✅ OTP email sent successfully!');
    console.log(`📬 Please check your inbox at ${toEmail}`);
  } catch (error: any) {
    console.error('❌ Error sending email:');
    console.error('Error:', error.message);
    if (error.response?.body) {
      console.error('SendGrid Response:', JSON.stringify(error.response.body, null, 2));
    }
    console.error('');
    console.error('💡 Solution:');
    console.error('1. Go to SendGrid Dashboard: https://app.sendgrid.com/');
    console.error('2. Navigate to Settings > Sender Authentication');
    console.error('3. Verify either:');
    console.error('   - Single Sender Verification: Verify your email address');
    console.error('   - Domain Authentication: Verify your domain');
    console.error('4. Update SENDGRID_FROM_EMAIL in backend/.env to the verified email');
  }
  
  process.exit(0);
}

sendOTPDirect();
