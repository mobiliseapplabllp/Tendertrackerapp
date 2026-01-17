import * as dotenv from 'dotenv';
import * as path from 'path';
import mysql from 'mysql2/promise';
import { NotificationService } from '../src/services/notificationService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

interface TestTender {
  tenderNumber: string;
  title: string;
  description: string;
  status: string;
  submissionDeadline: string;
  estimatedValue: number;
  currency: string;
  companyId?: number;
}

let db: mysql.Connection | null = null;

async function getDbConnection() {
  if (!db) {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tendertrack_db',
    });
  }
  return db;
}

async function createTestTenders() {
  const connection = await getDbConnection();
  console.log('📝 Creating test tenders with different deadline dates...\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const testTenders: TestTender[] = [
    {
      tenderNumber: 'TEST-30DAYS-001',
      title: 'Test Tender - 30 Days Warning',
      description: 'This tender is for testing 30 days early warning notification',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 1000000,
      currency: 'INR',
    },
    {
      tenderNumber: 'TEST-15DAYS-001',
      title: 'Test Tender - 15 Days Mid-term Reminder',
      description: 'This tender is for testing 15 days mid-term reminder',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 2000000,
      currency: 'INR',
    },
    {
      tenderNumber: 'TEST-10DAYS-001',
      title: 'Test Tender - 10 Days Preparation Reminder',
      description: 'This tender is for testing 10 days preparation time reminder',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 3000000,
      currency: 'INR',
    },
    {
      tenderNumber: 'TEST-7DAYS-001',
      title: 'Test Tender - 7 Days One Week Warning',
      description: 'This tender is for testing 7 days one week warning',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 4000000,
      currency: 'INR',
    },
    {
      tenderNumber: 'TEST-3DAYS-001',
      title: 'Test Tender - 3 Days Final Preparation',
      description: 'This tender is for testing 3 days final preparation alert',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 5000000,
      currency: 'INR',
    },
    {
      tenderNumber: 'TEST-2DAYS-001',
      title: 'Test Tender - 2 Days Urgent Reminder',
      description: 'This tender is for testing 2 days urgent reminder',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 6000000,
      currency: 'INR',
    },
    {
      tenderNumber: 'TEST-1DAY-001',
      title: 'Test Tender - 1 Day Final Alert',
      description: 'This tender is for testing 1 day final day alert',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 7000000,
      currency: 'INR',
    },
    {
      tenderNumber: 'TEST-OVERDUE-001',
      title: 'Test Tender - Overdue',
      description: 'This tender is for testing overdue daily alerts',
      status: 'Under Review',
      submissionDeadline: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      estimatedValue: 8000000,
      currency: 'INR',
    },
  ];

      // Get first user as created_by
      const [users] = await connection.query('SELECT id FROM users LIMIT 1');
      const userId = (users as any[])[0]?.id || 1;

  const createdTenders: any[] = [];

  for (const tender of testTenders) {
    try {
      // Check if tender already exists
      const [existing] = await connection.query(
        'SELECT id FROM tenders WHERE tender_number = ?',
        [tender.tenderNumber]
      );

      if ((existing as any[]).length > 0) {
        console.log(`  ⚠️  Tender ${tender.tenderNumber} already exists, skipping...`);
        createdTenders.push((existing as any[])[0]);
        continue;
      }

      const [result] = await connection.query(
        `INSERT INTO tenders (
          tender_number, title, description, status, submission_deadline,
          estimated_value, currency, created_by, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tender.tenderNumber,
          tender.title,
          tender.description,
          tender.status,
          tender.submissionDeadline,
          tender.estimatedValue,
          tender.currency,
          userId,
          'High',
        ]
      );

      const insertResult = result as any;
      createdTenders.push({ id: insertResult.insertId, ...tender });
      console.log(`  ✅ Created: ${tender.tenderNumber} - ${tender.title}`);
    } catch (error: any) {
      console.error(`  ❌ Error creating ${tender.tenderNumber}:`, error.message);
    }
  }

  console.log(`\n✅ Created ${createdTenders.length} test tenders\n`);
  return createdTenders;
}

async function sendTestEmails() {
  console.log('📧 Sending test emails for each notification category...\n');

  try {
    // Get email recipients
    const { recipients } = await NotificationService.getEmailAlertSettings();

    if (recipients.length === 0) {
      console.error('❌ No email recipients configured. Please add recipients in Email Alerts configuration page.');
      return;
    }

    console.log(`📬 Recipients: ${recipients.join(', ')}\n`);

    // Send test emails for each notification type
    const testCases = [
      { type: 'Early warning for upcoming tenders', days: 30 },
      { type: 'Mid-term reminder', days: 15 },
      { type: 'Preparation time reminder', days: 10 },
      { type: 'One week warning', days: 7 },
      { type: 'Final preparation alert', days: 3 },
      { type: 'Urgent reminder', days: 2 },
      { type: 'Final day alert', days: 1 },
      { type: 'Daily alerts for overdue tenders', days: -5 },
    ];

    for (const testCase of testCases) {
      try {
        console.log(`📤 Sending test email: ${testCase.type} (${testCase.days} days)...`);
        await NotificationService.sendTestEmail(
          recipients,
          testCase.type,
          testCase.days
        );
        console.log(`  ✅ Sent successfully\n`);
      } catch (error: any) {
        console.error(`  ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('✅ All test emails sent!\n');
  } catch (error: any) {
    console.error('❌ Error sending test emails:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Starting test notification process...\n');

    // Step 1: Create test tenders
    await createTestTenders();

    // Step 2: Send test emails
    await sendTestEmails();

    console.log('✅ Test notification process completed!\n');
    console.log('📝 Note: Check your email inbox for the test notifications.');
    console.log('📝 Note: The test tenders have been created with appropriate deadline dates.');
    console.log('📝 Note: Real notifications will be sent automatically based on the schedule.\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
    }
  }
}

// Run the script
main();

