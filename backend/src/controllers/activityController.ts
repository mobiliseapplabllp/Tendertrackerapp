import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class ActivityController {
  /**
   * Get all activities for a lead
   */
  static async getByLead(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId } = req.params;
      const { type } = req.query; // 'call', 'meeting', 'email', 'task'

      let query = '';
      const params: any[] = [leadId];

      switch (type) {
        case 'call':
          query = 'SELECT * FROM calls WHERE lead_id = ? ORDER BY call_date DESC';
          break;
        case 'meeting':
          query = 'SELECT * FROM meetings WHERE lead_id = ? ORDER BY meeting_date DESC';
          break;
        case 'email':
          query = 'SELECT * FROM emails WHERE lead_id = ? ORDER BY sent_at DESC';
          break;
        case 'task':
          query = 'SELECT * FROM tasks WHERE lead_id = ? ORDER BY due_date ASC, created_at DESC';
          break;
        default:
          // Get all activities
          query = `
            (SELECT 'call' as activity_type, id, lead_id, user_id, subject as title, call_date as activity_date, notes as description, NULL as status, created_at
             FROM calls WHERE lead_id = ?)
            UNION ALL
            (SELECT 'meeting' as activity_type, id, lead_id, user_id, subject as title, meeting_date as activity_date, notes as description, NULL as status, created_at
             FROM meetings WHERE lead_id = ?)
            UNION ALL
            (SELECT 'email' as activity_type, id, lead_id, user_id, subject as title, sent_at as activity_date, body as description, NULL as status, created_at
             FROM emails WHERE lead_id = ?)
            UNION ALL
            (SELECT 'task' as activity_type, id, lead_id, user_id, title, due_date as activity_date, description, status, created_at
             FROM tasks WHERE lead_id = ?)
            ORDER BY activity_date DESC, created_at DESC
          `;
          params.push(leadId, leadId, leadId);
      }

      const [activities] = await db.query(query, params);

      // Get user information for activities
      const activitiesArray = activities as any[];
      for (const activity of activitiesArray) {
        const [users] = await db.query(
          'SELECT id, full_name, email FROM users WHERE id = ?',
          [activity.user_id]
        );
        activity.user = (users as any[])[0];
      }

      res.json({
        success: true,
        data: activitiesArray,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a call
   */
  static async createCall(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId } = req.params;
      const { subject, callType, durationMinutes, callDate, notes } = req.body;

      if (!subject || !callDate) {
        throw new CustomError('Subject and call date are required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO calls (lead_id, user_id, subject, call_type, duration_minutes, call_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          leadId,
          req.user!.userId,
          subject,
          callType || 'Outbound',
          durationMinutes || null,
          callDate,
          notes || null,
        ]
      );

      const insertResult = result as any;
      const callId = insertResult.insertId;

      logger.info({
        message: 'Call created',
        callId,
        leadId,
        createdBy: req.user!.userId,
      });

      // Get created call
      const [calls] = await db.query('SELECT * FROM calls WHERE id = ?', [callId]);

      res.status(201).json({
        success: true,
        data: (calls as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a meeting
   */
  static async createMeeting(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId } = req.params;
      const { subject, meetingDate, location, notes } = req.body;

      if (!subject || !meetingDate) {
        throw new CustomError('Subject and meeting date are required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO meetings (lead_id, user_id, subject, meeting_date, location, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          leadId,
          req.user!.userId,
          subject,
          meetingDate,
          location || null,
          notes || null,
        ]
      );

      const insertResult = result as any;
      const meetingId = insertResult.insertId;

      logger.info({
        message: 'Meeting created',
        meetingId,
        leadId,
        createdBy: req.user!.userId,
      });

      // Get created meeting
      const [meetings] = await db.query('SELECT * FROM meetings WHERE id = ?', [meetingId]);

      res.status(201).json({
        success: true,
        data: (meetings as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create an email log
   */
  static async createEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId } = req.params;
      const { subject, sender, recipients, body } = req.body;

      if (!subject || !sender || !recipients) {
        throw new CustomError('Subject, sender, and recipients are required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO emails (lead_id, user_id, subject, sender, recipients, body)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          leadId,
          req.user!.userId,
          subject,
          sender,
          Array.isArray(recipients) ? recipients.join(',') : recipients,
          body || null,
        ]
      );

      const insertResult = result as any;
      const emailId = insertResult.insertId;

      logger.info({
        message: 'Email logged',
        emailId,
        leadId,
        createdBy: req.user!.userId,
      });

      // Get created email
      const [emails] = await db.query('SELECT * FROM emails WHERE id = ?', [emailId]);

      res.status(201).json({
        success: true,
        data: (emails as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a task
   */
  static async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId } = req.params;
      const { title, description, dueDate, priority, status, assignedTo } = req.body;

      if (!title) {
        throw new CustomError('Task title is required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO tasks (lead_id, user_id, title, description, due_date, priority, status, assigned_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          leadId,
          req.user!.userId,
          title,
          description || null,
          dueDate || null,
          priority || 'Medium',
          status || 'Not Started',
          assignedTo || null,
        ]
      );

      const insertResult = result as any;
      const taskId = insertResult.insertId;

      logger.info({
        message: 'Task created',
        taskId,
        leadId,
        createdBy: req.user!.userId,
      });

      // Get created task
      const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);

      res.status(201).json({
        success: true,
        data: (tasks as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a call
   */
  static async updateCall(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, callId } = req.params;
      const updateData = req.body;

      // Verify call belongs to lead
      const [calls] = await db.query(
        'SELECT * FROM calls WHERE id = ? AND lead_id = ?',
        [callId, leadId]
      );

      if ((calls as any[]).length === 0) {
        throw new CustomError('Call not found', 404);
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (updateData.subject !== undefined) {
        updates.push('subject = ?');
        params.push(updateData.subject);
      }
      if (updateData.callType !== undefined) {
        updates.push('call_type = ?');
        params.push(updateData.callType);
      }
      if (updateData.durationMinutes !== undefined) {
        updates.push('duration_minutes = ?');
        params.push(updateData.durationMinutes);
      }
      if (updateData.callDate !== undefined) {
        updates.push('call_date = ?');
        params.push(updateData.callDate);
      }
      if (updateData.notes !== undefined) {
        updates.push('notes = ?');
        params.push(updateData.notes);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(callId, leadId);

      await db.query(
        `UPDATE calls SET ${updates.join(', ')} WHERE id = ? AND lead_id = ?`,
        params
      );

      // Get updated call
      const [updatedCalls] = await db.query(
        'SELECT * FROM calls WHERE id = ?',
        [callId]
      );

      res.json({
        success: true,
        data: (updatedCalls as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a meeting
   */
  static async updateMeeting(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, meetingId } = req.params;
      const updateData = req.body;

      // Verify meeting belongs to lead
      const [meetings] = await db.query(
        'SELECT * FROM meetings WHERE id = ? AND lead_id = ?',
        [meetingId, leadId]
      );

      if ((meetings as any[]).length === 0) {
        throw new CustomError('Meeting not found', 404);
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (updateData.subject !== undefined) {
        updates.push('subject = ?');
        params.push(updateData.subject);
      }
      if (updateData.meetingDate !== undefined) {
        updates.push('meeting_date = ?');
        params.push(updateData.meetingDate);
      }
      if (updateData.location !== undefined) {
        updates.push('location = ?');
        params.push(updateData.location);
      }
      if (updateData.notes !== undefined) {
        updates.push('notes = ?');
        params.push(updateData.notes);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(meetingId, leadId);

      await db.query(
        `UPDATE meetings SET ${updates.join(', ')} WHERE id = ? AND lead_id = ?`,
        params
      );

      // Get updated meeting
      const [updatedMeetings] = await db.query(
        'SELECT * FROM meetings WHERE id = ?',
        [meetingId]
      );

      res.json({
        success: true,
        data: (updatedMeetings as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a task
   */
  static async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, taskId } = req.params;
      const updateData = req.body;

      // Verify task belongs to lead
      const [tasks] = await db.query(
        'SELECT * FROM tasks WHERE id = ? AND lead_id = ?',
        [taskId, leadId]
      );

      if ((tasks as any[]).length === 0) {
        throw new CustomError('Task not found', 404);
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (updateData.title !== undefined) {
        updates.push('title = ?');
        params.push(updateData.title);
      }
      if (updateData.description !== undefined) {
        updates.push('description = ?');
        params.push(updateData.description);
      }
      if (updateData.dueDate !== undefined) {
        updates.push('due_date = ?');
        params.push(updateData.dueDate);
      }
      if (updateData.priority !== undefined) {
        updates.push('priority = ?');
        params.push(updateData.priority);
      }
      if (updateData.status !== undefined) {
        updates.push('status = ?');
        params.push(updateData.status);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(taskId, leadId);

      await db.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND lead_id = ?`,
        params
      );

      // Get updated task
      const [updatedTasks] = await db.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      res.json({
        success: true,
        data: (updatedTasks as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete a call
   */
  static async deleteCall(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, callId } = req.params;

      const [result] = await db.query(
        'DELETE FROM calls WHERE id = ? AND lead_id = ?',
        [callId, leadId]
      );

      const deleteResult = result as any;
      if (deleteResult.affectedRows === 0) {
        throw new CustomError('Call not found', 404);
      }

      res.json({
        success: true,
        data: { message: 'Call deleted successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete a meeting
   */
  static async deleteMeeting(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, meetingId } = req.params;

      const [result] = await db.query(
        'DELETE FROM meetings WHERE id = ? AND lead_id = ?',
        [meetingId, leadId]
      );

      const deleteResult = result as any;
      if (deleteResult.affectedRows === 0) {
        throw new CustomError('Meeting not found', 404);
      }

      res.json({
        success: true,
        data: { message: 'Meeting deleted successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, taskId } = req.params;

      const [result] = await db.query(
        'DELETE FROM tasks WHERE id = ? AND lead_id = ?',
        [taskId, leadId]
      );

      const deleteResult = result as any;
      if (deleteResult.affectedRows === 0) {
        throw new CustomError('Task not found', 404);
      }

      res.json({
        success: true,
        data: { message: 'Task deleted successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }
}


