import dotenv from 'dotenv';
import { ReminderService } from '../services/reminderService';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Script to send work log reminders
 * This should be run periodically (e.g., via cron job) to send reminders
 * 
 * Usage:
 *   npm run send-reminders
 *   or
 *   ts-node src/scripts/send-reminders.ts
 */
async function sendReminders() {
  try {
    logger.info('Starting reminder sending process...');
    await ReminderService.sendReminders();
    logger.info('Reminder sending process completed');
    process.exit(0);
  } catch (error: any) {
    logger.error({
      message: 'Error in reminder sending process',
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  sendReminders();
}

export default sendReminders;

