import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';

export class LeadCaptureController {

  // ==================== FORMS (AUTH) ====================

  /**
   * Get all lead capture forms with submission counts
   */
  static async getForms(_req: Request, res: Response, next: NextFunction) {
    try {
      const [forms] = await db.query(
        `SELECT lcf.*,
                (SELECT COUNT(*) FROM lead_capture_submissions lcs WHERE lcs.form_id = lcf.id) as submission_count
         FROM lead_capture_forms lcf
         ORDER BY lcf.created_at DESC`
      );

      res.json({ success: true, data: forms });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get a single form by ID
   */
  static async getFormById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [forms] = await db.query(
        `SELECT lcf.*,
                (SELECT COUNT(*) FROM lead_capture_submissions lcs WHERE lcs.form_id = lcf.id) as submission_count
         FROM lead_capture_forms lcf
         WHERE lcf.id = ?`,
        [id]
      );

      const form = (forms as any[])[0];
      if (!form) {
        throw new CustomError('Form not found', 404);
      }

      res.json({ success: true, data: form });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new lead capture form with a unique token
   */
  static async createForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, title, description, fields, thank_you_message, redirect_url, is_active } = req.body;

      if (!name) {
        throw new CustomError('name is required', 400);
      }

      const formToken = crypto.randomBytes(32).toString('hex');

      const [result] = await db.query(
        `INSERT INTO lead_capture_forms
         (name, title, description, fields, form_token, thank_you_message, redirect_url, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          title || null,
          description || null,
          fields ? JSON.stringify(fields) : null,
          formToken,
          thank_you_message || 'Thank you for your submission!',
          redirect_url || null,
          is_active !== false,
          req.user!.userId,
        ]
      );

      const insertId = (result as any).insertId;
      const [newForm] = await db.query('SELECT * FROM lead_capture_forms WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newForm as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a lead capture form
   */
  static async updateForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const allowedFields = ['name', 'title', 'description', 'fields', 'thank_you_message', 'redirect_url', 'is_active'];

      const updates: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          const value = field === 'fields' && typeof req.body[field] === 'object'
            ? JSON.stringify(req.body[field])
            : req.body[field];
          params.push(value);
        }
      }

      if (updates.length === 0) {
        throw new CustomError('No valid fields to update', 400);
      }

      params.push(id);

      const [result] = await db.query(
        `UPDATE lead_capture_forms SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Form not found', 404);
      }

      const [updated] = await db.query('SELECT * FROM lead_capture_forms WHERE id = ?', [id]);
      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete a lead capture form
   */
  static async deleteForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [result] = await db.query(
        'DELETE FROM lead_capture_forms WHERE id = ?',
        [id]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Form not found', 404);
      }

      res.json({ success: true, message: 'Form deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== PUBLIC ENDPOINTS (NO AUTH) ====================

  /**
   * Get a public form by its token (for embedding)
   */
  static async getPublicForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      const [forms] = await db.query(
        `SELECT id, name, description, fields, thank_you_message, redirect_url
         FROM lead_capture_forms
         WHERE form_token = ? AND is_active = TRUE`,
        [token]
      );

      const form = (forms as any[])[0];
      if (!form) {
        throw new CustomError('Form not found or inactive', 404);
      }

      res.json({ success: true, data: form });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Submit a public form (no auth required)
   */
  static async submitForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const submissionData = req.body;

      // Fetch the form
      const [forms] = await db.query(
        'SELECT * FROM lead_capture_forms WHERE form_token = ? AND is_active = TRUE',
        [token]
      );

      const form = (forms as any[])[0];
      if (!form) {
        throw new CustomError('Form not found or inactive', 404);
      }

      // Validate submission against form fields if defined
      if (form.fields) {
        const formFields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;

        if (Array.isArray(formFields)) {
          for (const field of formFields) {
            if (field.required && !submissionData[field.name]) {
              throw new CustomError(`Field '${field.label || field.name}' is required`, 400);
            }
          }
        }
      }

      // Insert submission
      const [result] = await db.query(
        `INSERT INTO lead_capture_submissions (form_id, data, ip_address, user_agent)
         VALUES (?, ?, ?, ?)`,
        [
          form.id,
          JSON.stringify(submissionData),
          req.ip || null,
          req.get('user-agent') || null,
        ]
      );

      // Increment submission count on the form
      await db.query(
        'UPDATE lead_capture_forms SET submission_count = COALESCE(submission_count, 0) + 1 WHERE id = ?',
        [form.id]
      );

      res.status(201).json({
        success: true,
        message: form.thank_you_message || 'Thank you for your submission!',
        data: {
          submissionId: (result as any).insertId,
          redirectUrl: form.redirect_url || null,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== SUBMISSIONS (AUTH) ====================

  /**
   * Get form submissions with pagination and optional form_id filter
   */
  static async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const formId = req.query.form_id as string;
      const offset = (page - 1) * pageSize;

      let whereClause = '1 = 1';
      const params: any[] = [];

      if (formId) {
        whereClause += ' AND lcs.form_id = ?';
        params.push(formId);
      }

      const [submissions] = await db.query(
        `SELECT lcs.*, lcf.name as form_name
         FROM lead_capture_submissions lcs
         JOIN lead_capture_forms lcf ON lcf.id = lcs.form_id
         WHERE ${whereClause}
         ORDER BY lcs.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM lead_capture_submissions lcs WHERE ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: submissions,
        pagination: {
          page,
          pageSize,
          total: (countResult as any[])[0].total,
          totalPages: Math.ceil((countResult as any[])[0].total / pageSize),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Convert a form submission to a lead (inserts into tenders table)
   */
  static async convertToLead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Fetch the submission
      const [submissions] = await db.query(
        'SELECT * FROM lead_capture_submissions WHERE id = ?',
        [id]
      );

      const submission = (submissions as any[])[0];
      if (!submission) {
        throw new CustomError('Submission not found', 404);
      }

      if (submission.converted_to_lead_id) {
        throw new CustomError('Submission has already been converted to a lead', 400);
      }

      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;

      // Create lead in tenders table
      const title = data.company || data.name || data.email || 'Lead from form submission';
      const description = Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      const [result] = await db.query(
        `INSERT INTO tenders (title, description, source, status, created_by)
         VALUES (?, ?, 'lead_capture_form', 'new', ?)`,
        [title, description, req.user!.userId]
      );

      const leadId = (result as any).insertId;

      // Update submission with the lead reference
      await db.query(
        'UPDATE lead_capture_submissions SET converted_to_lead_id = ? WHERE id = ?',
        [leadId, id]
      );

      res.json({
        success: true,
        data: { leadId, submissionId: submission.id },
        message: 'Submission converted to lead successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }
}
