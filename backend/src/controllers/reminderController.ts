import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';

export class ReminderController {
  /**
   * Create a reminder for a work log entry with email/SMS notifications
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.params;
      const { actionRequired, dueDate, recipients, sendEmail, sendSMS } = req.body;

      if (!actionRequired || !actionRequired.trim()) {
        throw new CustomError('Action required is mandatory', 400);
      }

      // Recipients are optional (Task can be unassigned)
      if (recipients && !Array.isArray(recipients)) {
        throw new CustomError('Recipients must be an array', 400);
      }

      // Validate recipients if present
      const validRecipients = recipients || [];
      for (const recipient of validRecipients) {
        if (!recipient.email && !recipient.phoneNumber && !recipient.userId) {
          throw new CustomError('Each recipient must have at least email, phone number, or user ID', 400);
        }
        if (recipient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
          throw new CustomError(`Invalid email format: ${recipient.email}`, 400);
        }
      }

      // Get activity to verify it exists and get tender_id
      const [activities] = await db.query(
        `SELECT * FROM tender_activities WHERE id = ?`,
        [parseInt(activityId)]
      );

      const activityArray = activities as any[];
      if (activityArray.length === 0) {
        throw new CustomError('Activity not found', 404);
      }

      const activity = activityArray[0];

      // Get tender details for email context
      const [tenders] = await db.query(
        `SELECT * FROM tenders WHERE id = ?`,
        [activity.tender_id]
      );
      const tender = (tenders as any[])[0];

      // Create reminder
      const [result] = await db.query(
        `INSERT INTO work_log_reminders (activity_id, tender_id, action_required, due_date, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          parseInt(activityId),
          activity.tender_id,
          actionRequired.trim(),
          dueDate || null,
          req.user!.userId,
        ]
      );

      const insertResult = result as any;
      const reminderId = insertResult.insertId;

      // Add recipients and send notifications
      for (const recipient of validRecipients) {
        let recipientEmail = recipient.email;
        let recipientPhone = recipient.phoneNumber;
        let recipientName = 'User';

        // If userId is provided, get email and phone from users table
        if (recipient.userId) {
          const [users] = await db.query(
            `SELECT email, phone, full_name FROM users WHERE id = ?`,
            [recipient.userId]
          );
          const userArray = users as any[];
          if (userArray.length > 0) {
            const user = userArray[0];
            recipientEmail = recipient.email || user.email;
            recipientPhone = recipient.phoneNumber || user.phone;
            recipientName = user.full_name || 'User';

            await db.query(
              `INSERT INTO work_log_reminder_recipients (reminder_id, email, phone_number, user_id)
               VALUES (?, ?, ?, ?)`,
              [
                reminderId,
                recipientEmail || null,
                recipientPhone || null,
                recipient.userId,
              ]
            );
          }
        } else {
          await db.query(
            `INSERT INTO work_log_reminder_recipients (reminder_id, email, phone_number)
             VALUES (?, ?, ?)`,
            [
              reminderId,
              recipientEmail || null,
              recipientPhone || null,
            ]
          );
        }

        // Send email notification if requested and email available
        if (sendEmail !== false && recipientEmail) {
          try {
            const subject = `New Task Assigned: ${actionRequired}`;
            const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date';

            const htmlBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">📋 New Task Assigned</h1>
                </div>
                <div style="background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">Hi ${recipientName},</p>
                  <p style="font-size: 14px; color: #4a5568; margin-bottom: 20px;">You have been assigned a new task:</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 20px;">
                    <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 10px 0;">${actionRequired}</h2>
                    <p style="color: #718096; font-size: 14px; margin: 5px 0;"><strong>Tender:</strong> ${tender?.title || 'N/A'}</p>
                    <p style="color: #718096; font-size: 14px; margin: 5px 0;"><strong>Due Date:</strong> ${dueDateStr}</p>
                  </div>
                  
                  <p style="font-size: 14px; color: #4a5568; margin-bottom: 20px;">Please log in to the Mobilise CRM to view details and update the task status.</p>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.APP_URL || process.env.CORS_ORIGIN || 'https://tendertracker.mobilisepro.com'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task</a>
                  </div>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="font-size: 12px; color: #a0aec0; margin: 0;">This is an automated notification from Mobilise CRM</p>
                  </div>
                </div>
              </div>
            `;

            const textBody = `
New Task Assigned

Hi ${recipientName},

You have been assigned a new task:

Task: ${actionRequired}
Tender: ${tender?.title || 'N/A'}
Due Date: ${dueDateStr}

Please log in to the Mobilise CRM to view details and update the task status.

Visit: ${process.env.APP_URL || process.env.CORS_ORIGIN || 'https://tendertracker.mobilisepro.com'}

---
This is an automated notification from Mobilise CRM
            `;

            await emailService.sendNotification(recipientEmail, subject, textBody, htmlBody);

            logger.info({
              message: 'Task assignment email sent',
              reminderId,
              recipient: recipientEmail,
            });
          } catch (emailError: any) {
            logger.error({
              message: 'Failed to send task assignment email',
              reminderId,
              recipient: recipientEmail,
              error: emailError.message,
            });
          }
        }

        // Send SMS notification if requested and phone available
        if (sendSMS !== false && recipientPhone) {
          try {
            const smsMessage = `New Task: ${actionRequired}. Due: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date'}. Check Mobilise CRM for details.`;

            await smsService.sendNotification(recipientPhone, smsMessage);

            logger.info({
              message: 'Task assignment SMS sent',
              reminderId,
              recipient: recipientPhone,
            });
          } catch (smsError: any) {
            logger.error({
              message: 'Failed to send task assignment SMS',
              reminderId,
              recipient: recipientPhone,
              error: smsError.message,
            });
          }
        }
      }

      // Get created reminder with relations
      const reminder = await ReminderController.getReminderById(reminderId);

      logger.info({
        message: 'Task reminder created with notifications',
        reminderId,
        activityId: parseInt(activityId),
        createdBy: req.user!.userId,
        emailSent: sendEmail !== false,
        smsSent: sendSMS !== false,
      });

      res.status(201).json({
        success: true,
        data: reminder,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get all reminders for a work log entry
   */
  static async getByActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.params;

      const [reminders] = await db.query(
        `SELECT 
          r.*,
          creator.id as creator_id, creator.full_name as creator_name, creator.email as creator_email,
          completer.id as completer_id, completer.full_name as completer_name, completer.email as completer_email
         FROM work_log_reminders r
         LEFT JOIN users creator ON r.created_by = creator.id
         LEFT JOIN users completer ON r.completed_by = completer.id
         WHERE r.activity_id = ? AND r.deleted_at IS NULL
         ORDER BY r.created_at DESC`,
        [parseInt(activityId)]
      );

      const remindersArray = reminders as any[];

      // Get recipients for each reminder
      for (const reminder of remindersArray) {
        const [recipients] = await db.query(
          `SELECT 
            rec.*,
            u.id as user_id, u.full_name as user_name, u.email as user_email, u.phone as user_phone
           FROM work_log_reminder_recipients rec
           LEFT JOIN users u ON rec.user_id = u.id
           WHERE rec.reminder_id = ?`,
          [reminder.id]
        );

        reminder.recipients = recipients as any[];
      }

      res.json({
        success: true,
        data: remindersArray.map(ReminderController.transformReminder),
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Mark reminder as complete
   */
  static async markComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const { reminderId } = req.params;

      // Verify reminder exists and is not already completed
      const [reminders] = await db.query(
        `SELECT * FROM work_log_reminders WHERE id = ? AND deleted_at IS NULL`,
        [parseInt(reminderId)]
      );

      const remindersArray = reminders as any[];
      if (remindersArray.length === 0) {
        throw new CustomError('Reminder not found', 404);
      }

      const reminder = remindersArray[0];

      if (reminder.is_completed) {
        throw new CustomError('Reminder is already completed', 400);
      }

      // Mark as complete
      await db.query(
        `UPDATE work_log_reminders 
         SET is_completed = TRUE, completed_at = NOW(), completed_by = ?
         WHERE id = ?`,
        [req.user!.userId, parseInt(reminderId)]
      );

      // Get updated reminder
      const updatedReminder = await ReminderController.getReminderById(parseInt(reminderId));

      logger.info({
        message: 'Task reminder marked as complete',
        reminderId: parseInt(reminderId),
        completedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: updatedReminder,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete a reminder
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { reminderId } = req.params;

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'work_log_reminders' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (checkError) {
        // If check fails, assume no soft delete support
      }

      if (hasDeletedAt) {
        await db.query(
          `UPDATE work_log_reminders SET deleted_at = NOW() WHERE id = ?`,
          [parseInt(reminderId)]
        );
      } else {
        // Hard delete
        await db.query(
          `DELETE FROM work_log_reminder_recipients WHERE reminder_id = ?`,
          [parseInt(reminderId)]
        );
        await db.query(
          `DELETE FROM work_log_reminders WHERE id = ?`,
          [parseInt(reminderId)]
        );
      }

      logger.info({
        message: 'Task reminder deleted',
        reminderId: parseInt(reminderId),
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Reminder deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get reminder by ID (helper method)
   */
  static async getReminderById(reminderId: number) {
    const [reminders] = await db.query(
      `SELECT 
        r.*,
        creator.id as creator_id, creator.full_name as creator_name, creator.email as creator_email,
        completer.id as completer_id, completer.full_name as completer_name, completer.email as completer_email
       FROM work_log_reminders r
       LEFT JOIN users creator ON r.created_by = creator.id
       LEFT JOIN users completer ON r.completed_by = completer.id
       WHERE r.id = ?`,
      [reminderId]
    );

    const remindersArray = reminders as any[];
    if (remindersArray.length === 0) {
      return null;
    }

    const reminder = remindersArray[0];

    // Get recipients
    const [recipients] = await db.query(
      `SELECT 
        rec.*,
        u.id as user_id, u.full_name as user_name, u.email as user_email, u.phone as user_phone
       FROM work_log_reminder_recipients rec
       LEFT JOIN users u ON rec.user_id = u.id
       WHERE rec.reminder_id = ?`,
      [reminderId]
    );

    reminder.recipients = recipients as any[];

    return ReminderController.transformReminder(reminder);
  }

  /**
   * Transform reminder from database format to API format
   */
  static transformReminder(reminder: any) {
    return {
      id: reminder.id,
      activityId: reminder.activity_id,
      tenderId: reminder.tender_id,
      actionRequired: reminder.action_required,
      dueDate: reminder.due_date,
      isCompleted: reminder.is_completed === 1 || reminder.is_completed === true,
      completedAt: reminder.completed_at,
      completedBy: reminder.completed_by,
      completedByUser: reminder.completer_name ? {
        id: reminder.completer_id,
        fullName: reminder.completer_name,
        email: reminder.completer_email,
      } : undefined,
      createdBy: reminder.created_by,
      createdByUser: reminder.creator_name ? {
        id: reminder.creator_id,
        fullName: reminder.creator_name,
        email: reminder.creator_email,
      } : undefined,
      createdAt: reminder.created_at,
      updatedAt: reminder.updated_at,
      recipients: (reminder.recipients || []).map((rec: any) => ({
        id: rec.id,
        reminderId: rec.reminder_id,
        email: rec.email,
        phoneNumber: rec.phone_number,
        userId: rec.user_id,
        user: rec.user_name ? {
          id: rec.user_id,
          fullName: rec.user_name,
          email: rec.user_email,
          phone: rec.user_phone,
        } : undefined,
        createdAt: rec.created_at,
      })),
    };
  }

  /**
   * Manually send notifications for a reminder
   */
  static async notify(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'email' or 'sms'

      // Get reminder with details
      const [reminders] = await db.query(
        `SELECT r.*, t.id as tender_id, t.title as tender_title, t.tender_number
         FROM work_log_reminders r
         JOIN tenders t ON r.tender_id = t.id
         WHERE r.id = ?`,
        [id]
      );

      const reminderArray = reminders as any[];
      if (reminderArray.length === 0) {
        throw new CustomError('Task not found', 404);
      }
      const reminder = reminderArray[0];

      // Get recipients
      const [recipients] = await db.query(
        `SELECT 
         rec.*,
         u.id as user_id, u.full_name as user_name, u.email as user_email, u.phone as user_phone
        FROM work_log_reminder_recipients rec
        LEFT JOIN users u ON rec.user_id = u.id
        WHERE rec.reminder_id = ?`,
        [id]
      );
      const recipientArray = recipients as any[];

      if (recipientArray.length === 0) {
        throw new CustomError('No recipients assigned to this task', 400);
      }

      let sentCount = 0;

      if (type === 'email') {
        for (const recipient of recipientArray) {
          const email = recipient.email || recipient.user_email;
          if (email) {
            await emailService.sendNotification(
              email,
              `Reminder: ${reminder.action_required}`,
              `Task Reminder: ${reminder.action_required}\nDue Date: ${reminder.due_date ? new Date(reminder.due_date).toLocaleDateString() : 'No due date'}\nTender: ${reminder.tender_title} (${reminder.tender_number})`,
              `
                <h2>Task Reminder</h2>
                <p><strong>Task:</strong> ${reminder.action_required}</p>
                <p><strong>Due Date:</strong> ${reminder.due_date ? new Date(reminder.due_date).toLocaleDateString() : 'No due date'}</p>
                <p><strong>Tender:</strong> ${reminder.tender_title} (${reminder.tender_number})</p>
                <p>Please complete this task as soon as possible.</p>
              `
            );
            sentCount++;
          }
        }
      } else if (type === 'sms') {
        // SMS implementation placeholder
        // sentCount = ...
      }

      res.json({
        success: true,
        message: `Notifications sent to ${sentCount} recipients`,
      });
    } catch (error: any) {
      next(error);
    }
  }
}
