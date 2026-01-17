import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class SalesStageController {
  /**
   * Get all sales stages
   */
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const [stages] = await db.query(
        'SELECT * FROM sales_stages WHERE is_active = TRUE ORDER BY display_order ASC, name ASC'
      );

      res.json({
        success: true,
        data: stages,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get sales stage by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [stages] = await db.query(
        'SELECT * FROM sales_stages WHERE id = ?',
        [id]
      );

      const stagesArray = stages as any[];
      if (stagesArray.length === 0) {
        throw new CustomError('Sales stage not found', 404);
      }

      res.json({
        success: true,
        data: stagesArray[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create sales stage (Admin only)
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, probability, stageOrder, isActive } = req.body;

      if (!name) {
        throw new CustomError('Sales stage name is required', 400);
      }

      // Check if name already exists
      const [existing] = await db.query(
        'SELECT id FROM sales_stages WHERE name = ?',
        [name]
      );

      if ((existing as any[]).length > 0) {
        throw new CustomError('Sales stage with this name already exists', 409);
      }

      const [result] = await db.query(
        `INSERT INTO sales_stages (name, description, probability, display_order, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          name,
          description || null,
          probability || 0,
          stageOrder || 0,
          isActive !== undefined ? isActive : true,
        ]
      );

      const insertResult = result as any;
      const stageId = insertResult.insertId;

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'CREATE_SALES_STAGE',
          'SalesStage',
          stageId,
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ name }),
        ]
      );

      logger.info({
        message: 'Sales stage created',
        stageId,
        createdBy: req.user!.userId,
      });

      // Get created stage
      const [stages] = await db.query(
        'SELECT * FROM sales_stages WHERE id = ?',
        [stageId]
      );

      res.status(201).json({
        success: true,
        data: (stages as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update sales stage (Admin only)
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, probability, stageOrder, isActive } = req.body;

      // Check if stage exists
      const [existing] = await db.query(
        'SELECT * FROM sales_stages WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Sales stage not found', 404);
      }

      // Check if new name conflicts
      if (name && name !== existingArray[0].name) {
        const [nameCheck] = await db.query(
          'SELECT id FROM sales_stages WHERE name = ? AND id != ?',
          [name, id]
        );
        if ((nameCheck as any[]).length > 0) {
          throw new CustomError('Sales stage with this name already exists', 409);
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
      if (probability !== undefined) {
        updates.push('probability = ?');
        params.push(probability);
      }
      if (stageOrder !== undefined) {
        updates.push('display_order = ?');
        params.push(stageOrder);
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
        `UPDATE sales_stages SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'UPDATE_SALES_STAGE',
          'SalesStage',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ name, description, probability, stageOrder, isActive }),
        ]
      );

      logger.info({
        message: 'Sales stage updated',
        stageId: id,
        updatedBy: req.user!.userId,
      });

      // Get updated stage
      const [stages] = await db.query(
        'SELECT * FROM sales_stages WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: (stages as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete sales stage (Admin only)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if stage exists
      const [existing] = await db.query(
        'SELECT * FROM sales_stages WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Sales stage not found', 404);
      }

      // Check if any leads are using this stage
      const [leadsUsing] = await db.query(
        'SELECT COUNT(*) as count FROM tenders WHERE sales_stage_id = ?',
        [id]
      );
      const count = (leadsUsing as any[])[0]?.count || 0;

      if (count > 0) {
        throw new CustomError(
          `Cannot delete sales stage. ${count} lead(s) are using this stage. Please reassign them first.`,
          400
        );
      }

      await db.query('DELETE FROM sales_stages WHERE id = ?', [id]);

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'DELETE_SALES_STAGE',
          'SalesStage',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ deletedStage: existingArray[0].name }),
        ]
      );

      logger.info({
        message: 'Sales stage deleted',
        stageId: id,
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Sales stage deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

