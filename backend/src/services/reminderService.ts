import db from '../config/database';
import logger from '../utils/logger';
import { emailService } from './emailService';
import { smsService } from './smsService';

export class ReminderService {
  /**
   * Send reminders for incomplete work log reminders
   */
  static async sendReminders() {
    try {
      // Get all incomplete reminders that are due or overdue
      const [reminders] = await db.query(
        `SELECT 
          r.*,
          ta.description as work_log_description,
          t.tender_number, t.title as tender_title,
          creator.full_name as creator_name, creator.email as creator_email
         FROM work_log_reminders r
         INNER JOIN tender_activities ta ON r.activity_id = ta.id
         INNER JOIN tenders t ON r.tender_id = t.id
         LEFT JOIN users creator ON r.created_by = creator.id
         WHERE r.is_completed = FALSE 
           AND r.deleted_at IS NULL
           AND (r.due_date IS NULL OR r.due_date <= CURDATE())
         ORDER BY r.due_date ASC, r.created_at ASC`
      );

      const remindersArray = reminders as any[];

      if (remindersArray.length === 0) {
        logger.info('No pending reminders to send');
        return;
      }

      logger.info({
        message: `Processing ${remindersArray.length} pending reminders`,
      });

      for (const reminder of remindersArray) {
        try {
          // Get recipients for this reminder
          const [recipients] = await db.query(
            `SELECT 
              rec.*,
              u.email as user_email, u.phone as user_phone, u.full_name as user_name
             FROM work_log_reminder_recipients rec
             LEFT JOIN users u ON rec.user_id = u.id
             WHERE rec.reminder_id = ?`,
            [reminder.id]
          );

          const recipientsArray = recipients as any[];

          for (const recipient of recipientsArray) {
            const email = recipient.email || recipient.user_email;
            const phone = recipient.phone_number || recipient.user_phone;
            const recipientName = recipient.user_name || email?.split('@')[0] || 'User';

            // Send email reminder
            if (email) {
              try {
                const subject = `Action Required: ${reminder.action_required} - Tender ${reminder.tender_number}`;
                const htmlBody = this.generateEmailBody(reminder, recipientName);
                const textBody = this.generateEmailText(reminder, recipientName);

                await emailService.sendNotification(email, subject, textBody, htmlBody);

                // Log email sent
                await db.query(
                  `INSERT INTO work_log_reminder_sent (reminder_id, recipient_id, sent_via)
                   VALUES (?, ?, 'email')`,
                  [reminder.id, recipient.id]
                );

                logger.info({
                  message: 'Reminder email sent',
                  reminderId: reminder.id,
                  email,
                });
              } catch (emailError: any) {
                logger.error({
                  message: 'Failed to send reminder email',
                  reminderId: reminder.id,
                  email,
                  error: emailError.message,
                });
              }
            }

            // Send SMS reminder
            if (phone) {
              try {
                const message = this.generateSMSMessage(reminder);
                await smsService.sendNotification(phone, message);

                // Log SMS sent
                await db.query(
                  `INSERT INTO work_log_reminder_sent (reminder_id, recipient_id, sent_via)
                   VALUES (?, ?, 'sms')`,
                  [reminder.id, recipient.id]
                );

                logger.info({
                  message: 'Reminder SMS sent',
                  reminderId: reminder.id,
                  phone,
                });
              } catch (smsError: any) {
                logger.error({
                  message: 'Failed to send reminder SMS',
                  reminderId: reminder.id,
                  phone,
                  error: smsError.message,
                });
              }
            }

            // If both email and SMS sent, log as 'both'
            if (email && phone) {
              // Update the last sent record to 'both' if both were sent
              await db.query(
                `UPDATE work_log_reminder_sent 
                 SET sent_via = 'both' 
                 WHERE reminder_id = ? AND recipient_id = ? 
                 ORDER BY sent_at DESC LIMIT 1`,
                [reminder.id, recipient.id]
              );
            }
          }
        } catch (reminderError: any) {
          logger.error({
            message: 'Error processing reminder',
            reminderId: reminder.id,
            error: reminderError.message,
          });
        }
      }

      logger.info({
        message: 'Reminder processing completed',
        processed: remindersArray.length,
      });
    } catch (error: any) {
      logger.error({
        message: 'Error in sendReminders',
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Generate HTML email body for reminder
   */
  private static generateEmailBody(reminder: any, recipientName: string): string {
    const dueDateText = reminder.due_date 
      ? new Date(reminder.due_date).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : 'No due date specified';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .action-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 Action Required: Work Log Reminder</h2>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <p>You have a pending action item related to a tender work log entry.</p>
            
            <div class="action-box">
              <strong>Action Required:</strong> ${reminder.action_required}
            </div>
            
            <p><strong>Tender:</strong> ${reminder.tender_number} - ${reminder.tender_title}</p>
            <p><strong>Work Log:</strong> ${reminder.work_log_description || 'N/A'}</p>
            <p><strong>Due Date:</strong> ${dueDateText}</p>
            <p><strong>Created By:</strong> ${reminder.creator_name || 'System'}</p>
            
            <p>Please complete this action and mark it as complete in the system.</p>
            
            <p>This reminder will continue to be sent until the action is marked as complete.</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from Mobilise CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email body for reminder
   */
  private static generateEmailText(reminder: any, recipientName: string): string {
    const dueDateText = reminder.due_date 
      ? new Date(reminder.due_date).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : 'No due date specified';

    return `
Action Required: Work Log Reminder

Hello ${recipientName},

You have a pending action item related to a tender work log entry.

Action Required: ${reminder.action_required}

Tender: ${reminder.tender_number} - ${reminder.tender_title}
Work Log: ${reminder.work_log_description || 'N/A'}
Due Date: ${dueDateText}
Created By: ${reminder.creator_name || 'System'}

Please complete this action and mark it as complete in the system.

This reminder will continue to be sent until the action is marked as complete.

---
This is an automated reminder from Mobilise CRM
    `.trim();
  }

  /**
   * Generate SMS message for reminder
   */
  private static generateSMSMessage(reminder: any): string {
    const dueDateText = reminder.due_date 
      ? new Date(reminder.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'No due date';

    return `Mobilise CRM: Action Required - "${reminder.action_required.substring(0, 50)}${reminder.action_required.length > 50 ? '...' : ''}" for Lead ${reminder.tender_number}. Due: ${dueDateText}. Please complete and mark as done.`;
  }
}

