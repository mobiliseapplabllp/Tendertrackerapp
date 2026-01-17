import dotenv from 'dotenv';
import path from 'path';
import { emailService } from '../src/services/emailService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testEmail() {
  const testEmail = 'ashish.sharma@mobilise.co.in';
  
  console.log('🧪 Testing SendGrid email configuration...');
  console.log(`📧 Sending test email to: ${testEmail}`);
  console.log(`🔑 API Key: ${process.env.SENDGRID_API_KEY ? 'Set' : 'NOT SET'}`);
  console.log(`📨 From Email: ${process.env.SENDGRID_FROM_EMAIL || 'noreply@tendertrack.com'}`);
  console.log('');

  try {
    // Initialize email service
    await emailService.initialize();
    
    // Send test email
    const success = await emailService.testConfiguration(testEmail);
    
    if (success) {
      console.log('✅ Test email sent successfully!');
      console.log(`📬 Please check your inbox at ${testEmail}`);
    } else {
      console.log('❌ Failed to send test email');
    }
  } catch (error: any) {
    console.error('❌ Error sending test email:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('SendGrid response:', JSON.stringify(error.response.body, null, 2));
    }
    console.error('');
    console.error('Common issues:');
    console.error('1. SendGrid API key is invalid or expired');
    console.error('2. From email address is not verified in SendGrid');
    console.error('3. SendGrid account has restrictions');
  }
  
  process.exit(0);
}

testEmail();

