import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class CompanyController {
  /**
   * Get all companies with filters
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const offset = (page - 1) * pageSize;
      let whereClause = '1=1';
      const params: any[] = [];

      if (search) {
        whereClause += ' AND (company_name LIKE ? OR email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM companies WHERE ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      const [companies] = await db.query(
        `SELECT * FROM companies WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: {
          data: companies,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get company by ID with contacts
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [companies] = await db.query(
        'SELECT * FROM companies WHERE id = ?',
        [id]
      );

      const companyArray = companies as any[];
      if (companyArray.length === 0) {
        throw new CustomError('Company not found', 404);
      }

      const company = companyArray[0];

      // Get contacts
      const [contacts] = await db.query(
        'SELECT * FROM contacts WHERE company_id = ? ORDER BY is_primary DESC, created_at ASC',
        [id]
      );
      company.contacts = contacts;

      res.json({
        success: true,
        data: company,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create company
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        companyName,
        industry,
        website,
        phone,
        email,
        address,
        city,
        state,
        country,
        postalCode,
        taxId,
      } = req.body;

      if (!companyName) {
        throw new CustomError('Company name is required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO companies (
          company_name, industry, website, phone, email, address, city, state, country, postal_code, tax_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyName,
          industry || null,
          website || null,
          phone || null,
          email || null,
          address || null,
          city || null,
          state || null,
          country || null,
          postalCode || null,
          taxId || null,
          req.user?.userId || null,
        ]
      );

      const insertResult = result as any;
      const companyId = insertResult.insertId;

      logger.info({
        message: 'Company created',
        companyId,
        createdBy: req.user?.userId,
      });

      const [companies] = await db.query(
        'SELECT * FROM companies WHERE id = ?',
        [companyId]
      );

      res.status(201).json({
        success: true,
        data: (companies as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update company
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [existing] = await db.query(
        'SELECT * FROM companies WHERE id = ?',
        [id]
      );

      if ((existing as any[]).length === 0) {
        throw new CustomError('Company not found', 404);
      }

      const updates: string[] = [];
      const params: any[] = [];

      const allowedFields = [
        'companyName', 'industry', 'website', 'phone', 'email', 'address',
        'city', 'state', 'country', 'postalCode', 'taxId', 'status'
      ];

      for (const field of allowedFields) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (updateData[field] !== undefined) {
          updates.push(`${dbField} = ?`);
          params.push(updateData[field] || null);
        }
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await db.query(
        `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const [companies] = await db.query(
        'SELECT * FROM companies WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: (companies as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete company
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [companies] = await db.query(
        'SELECT * FROM companies WHERE id = ?',
        [id]
      );

      if ((companies as any[]).length === 0) {
        throw new CustomError('Company not found', 404);
      }

      await db.query('DELETE FROM companies WHERE id = ?', [id]);

      res.json({
        success: true,
        data: { message: 'Company deleted successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get company contacts
   */
  static async getContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [contacts] = await db.query(
        'SELECT * FROM contacts WHERE company_id = ? ORDER BY is_primary DESC, created_at ASC',
        [id]
      );

      res.json({
        success: true,
        data: contacts,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Add contact to company
   */
  static async addContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        email,
        phone,
        mobile,
        position,
        department,
        isPrimary,
        notes,
      } = req.body;

      if (!firstName || !lastName) {
        throw new CustomError('First name and last name are required', 400);
      }

      // If setting as primary, unset other primary contacts
      if (isPrimary) {
        await db.query(
          'UPDATE contacts SET is_primary = FALSE WHERE company_id = ?',
          [id]
        );
      }

      const [result] = await db.query(
        `INSERT INTO contacts (
          company_id, first_name, last_name, email, phone, mobile, position, department, is_primary, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(id),
          firstName,
          lastName,
          email || null,
          phone || null,
          mobile || null,
          position || null,
          department || null,
          isPrimary || false,
          notes || null,
        ]
      );

      const insertResult = result as any;

      const [contacts] = await db.query(
        'SELECT * FROM contacts WHERE id = ?',
        [insertResult.insertId]
      );

      res.status(201).json({
        success: true,
        data: (contacts as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update contact
   */
  static async updateContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, contactId } = req.params;
      const {
        firstName,
        lastName,
        email,
        phone,
        mobile,
        position,
        department,
        isPrimary,
        notes,
      } = req.body;

      // Check if contact exists and belongs to company
      const [existing] = await db.query(
        'SELECT * FROM contacts WHERE id = ? AND company_id = ?',
        [contactId, id]
      );

      if ((existing as any[]).length === 0) {
        throw new CustomError('Contact not found', 404);
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (firstName !== undefined) {
        updates.push('first_name = ?');
        params.push(firstName);
      }

      if (lastName !== undefined) {
        updates.push('last_name = ?');
        params.push(lastName);
      }

      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email || null);
      }

      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone || null);
      }

      if (mobile !== undefined) {
        updates.push('mobile = ?');
        params.push(mobile || null);
      }

      if (position !== undefined) {
        updates.push('position = ?');
        params.push(position || null);
      }

      if (department !== undefined) {
        updates.push('department = ?');
        params.push(department || null);
      }

      if (isPrimary !== undefined) {
        // If setting as primary, unset other primary contacts
        if (isPrimary) {
          await db.query(
            'UPDATE contacts SET is_primary = FALSE WHERE company_id = ? AND id != ?',
            [id, contactId]
          );
        }
        updates.push('is_primary = ?');
        params.push(isPrimary);
      }

      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes || null);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(contactId);

      await db.query(
        `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const [contacts] = await db.query(
        'SELECT * FROM contacts WHERE id = ?',
        [contactId]
      );

      res.json({
        success: true,
        data: (contacts as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete contact
   */
  static async deleteContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, contactId } = req.params;

      // Check if contact exists and belongs to company
      const [existing] = await db.query(
        'SELECT * FROM contacts WHERE id = ? AND company_id = ?',
        [contactId, id]
      );

      if ((existing as any[]).length === 0) {
        throw new CustomError('Contact not found', 404);
      }

      await db.query('DELETE FROM contacts WHERE id = ?', [contactId]);

      res.json({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }
}

