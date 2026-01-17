import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class LeadTypeController {
  /**
   * Get all lead types
   */
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const [leadTypes] = await db.query(
        'SELECT * FROM lead_types WHERE is_active = TRUE ORDER BY display_order ASC, name ASC'
      );

      res.json({
        success: true,
        data: leadTypes,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get lead type by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [leadTypes] = await db.query(
        'SELECT * FROM lead_types WHERE id = ?',
        [id]
      );

      const leadTypesArray = leadTypes as any[];
      if (leadTypesArray.length === 0) {
        throw new CustomError('Lead type not found', 404);
      }

      res.json({
        success: true,
        data: leadTypesArray[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create lead type (Admin only)
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, icon, color, displayOrder, isActive } = req.body;

      if (!name) {
        throw new CustomError('Lead type name is required', 400);
      }

      // Check if name already exists
      const [existing] = await db.query(
        'SELECT id FROM lead_types WHERE name = ?',
        [name]
      );

      if ((existing as any[]).length > 0) {
        throw new CustomError('Lead type with this name already exists', 409);
      }

      const [result] = await db.query(
        `INSERT INTO lead_types (name, description, icon, color, display_order, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description || null,
          icon || null,
          color || null,
          displayOrder || 0,
          isActive !== undefined ? isActive : true,
          req.user!.userId,
        ]
      );

      const insertResult = result as any;
      const leadTypeId = insertResult.insertId;

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'CREATE_LEAD_TYPE',
          'LeadType',
          leadTypeId,
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ name }),
        ]
      );

      logger.info({
        message: 'Lead type created',
        leadTypeId,
        createdBy: req.user!.userId,
      });

      // Get created lead type
      const [leadTypes] = await db.query(
        'SELECT * FROM lead_types WHERE id = ?',
        [leadTypeId]
      );

      res.status(201).json({
        success: true,
        data: (leadTypes as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update lead type (Admin only)
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, icon, color, displayOrder, isActive } = req.body;

      // Check if lead type exists
      const [existing] = await db.query(
        'SELECT * FROM lead_types WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Lead type not found', 404);
      }

      // Check if new name conflicts (if name is being changed)
      if (name && name !== existingArray[0].name) {
        const [nameCheck] = await db.query(
          'SELECT id FROM lead_types WHERE name = ? AND id != ?',
          [name, id]
        );
        if ((nameCheck as any[]).length > 0) {
          throw new CustomError('Lead type with this name already exists', 409);
        }
      }

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (icon !== undefined) {
        updates.push('icon = ?');
        params.push(icon);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        params.push(color);
      }
      if (displayOrder !== undefined) {
        updates.push('display_order = ?');
        params.push(displayOrder);
      }
      if (isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(isActive);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await db.query(
        `UPDATE lead_types SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'UPDATE_LEAD_TYPE',
          'LeadType',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ name, description, icon, color, displayOrder, isActive }),
        ]
      );

      logger.info({
        message: 'Lead type updated',
        leadTypeId: id,
        updatedBy: req.user!.userId,
      });

      // Get updated lead type
      const [leadTypes] = await db.query(
        'SELECT * FROM lead_types WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: (leadTypes as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete lead type (Admin only)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if lead type exists
      const [existing] = await db.query(
        'SELECT * FROM lead_types WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Lead type not found', 404);
      }

      // Check if any leads are using this type
      const [leadsUsing] = await db.query(
        'SELECT COUNT(*) as count FROM leads WHERE lead_type_id = ?',
        [id]
      );
      const count = (leadsUsing as any[])[0]?.count || 0;

      if (count > 0) {
        throw new CustomError(
          `Cannot delete lead type. ${count} lead(s) are using this type. Please reassign them first.`,
          400
        );
      }

      await db.query('DELETE FROM lead_types WHERE id = ?', [id]);

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'DELETE_LEAD_TYPE',
          'LeadType',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ deletedLeadType: existingArray[0].name }),
        ]
      );

      logger.info({
        message: 'Lead type deleted',
        leadTypeId: id,
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Lead type deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

