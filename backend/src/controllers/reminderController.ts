import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';
// emailService and smsService will be used when implementing automated reminder sending
// import { emailService } from '../services/emailService';
// import { smsService } from '../services/smsService';

export class ReminderController {
  /**
   * Create a reminder for a work log entry
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { activityId } = req.params;
      const { actionRequired, dueDate, recipients } = req.body;

      if (!actionRequired || !actionRequired.trim()) {
        throw new CustomError('Action required is mandatory', 400);
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new CustomError('At least one recipient (email or phone) is required', 400);
      }

      // Validate recipients
      for (const recipient of recipients) {
        if (!recipient.email && !recipient.phoneNumber && !recipient.userId) {
          throw new CustomError('Each recipient must have at least email, phone number, or user ID', 400);
        }
        if (recipient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
          throw new CustomError(`Invalid email format: ${recipient.email}`, 400);
        }
      }

      // Get activity to verify it exists and get tender_id
      const [activities] = await db.query(
        `SELECT * FROM tender_activities WHERE id = ? AND activity_type = 'Commented'`,
        [parseInt(activityId)]
      );

      const activityArray = activities as any[];
      if (activityArray.length === 0) {
        throw new CustomError('Work log entry not found or is not a work log', 404);
      }

      const activity = activityArray[0];

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

      // Add recipients
      for (const recipient of recipients) {
        // If userId is provided, get email and phone from users table
        if (recipient.userId) {
          const [users] = await db.query(
            `SELECT email, phone FROM users WHERE id = ?`,
            [recipient.userId]
          );
          const userArray = users as any[];
          if (userArray.length > 0) {
            const user = userArray[0];
            await db.query(
              `INSERT INTO work_log_reminder_recipients (reminder_id, email, phone_number, user_id)
               VALUES (?, ?, ?, ?)`,
              [
                reminderId,
                recipient.email || user.email || null,
                recipient.phoneNumber || user.phone || null,
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
              recipient.email || null,
              recipient.phoneNumber || null,
            ]
          );
        }
      }

      // Get created reminder with relations
      const reminder = await ReminderController.getReminderById(reminderId);

      logger.info({
        message: 'Work log reminder created',
        reminderId,
        activityId: parseInt(activityId),
        createdBy: req.user!.userId,
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
        message: 'Work log reminder marked as complete',
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
        message: 'Work log reminder deleted',
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
}

