import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class ProductLineController {
  /**
   * Get all product lines
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';

      let query = `
        SELECT pl.*,
          (SELECT COUNT(*) FROM tenders t WHERE t.product_line_id = pl.id AND t.deleted_at IS NULL) as lead_count
        FROM product_lines pl
      `;

      if (!includeInactive) {
        query += ' WHERE pl.is_active = TRUE';
      }

      query += ' ORDER BY pl.display_order ASC, pl.name ASC';

      const [rows] = await db.query(query);
      const productLines = (rows as any[]).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        displayOrder: row.display_order,
        leadCount: row.lead_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      res.json({
        success: true,
        data: productLines,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get product line by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [rows] = await db.query(
        `SELECT pl.*,
          (SELECT COUNT(*) FROM tenders t WHERE t.product_line_id = pl.id AND t.deleted_at IS NULL) as lead_count
         FROM product_lines pl WHERE pl.id = ?`,
        [id]
      );

      const rowArray = rows as any[];
      if (rowArray.length === 0) {
        throw new CustomError('Product line not found', 404);
      }

      const row = rowArray[0];
      res.json({
        success: true,
        data: {
          id: row.id,
          name: row.name,
          description: row.description,
          isActive: row.is_active,
          displayOrder: row.display_order,
          leadCount: row.lead_count,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create product line (Admin only)
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, displayOrder } = req.body;

      if (!name) {
        throw new CustomError('Product line name is required', 400);
      }

      // Check for duplicate name
      const [existing] = await db.query(
        'SELECT id FROM product_lines WHERE name = ?',
        [name]
      );

      if ((existing as any[]).length > 0) {
        throw new CustomError('Product line with this name already exists', 409);
      }

      const [result] = await db.query(
        `INSERT INTO product_lines (name, description, display_order) VALUES (?, ?, ?)`,
        [name, description || null, displayOrder || 0]
      );

      const insertId = (result as any).insertId;

      logger.info({
        message: 'Product line created',
        productLineId: insertId,
        name,
        createdBy: req.user?.userId,
      });

      res.status(201).json({
        success: true,
        data: { id: insertId, name, description, isActive: true, displayOrder: displayOrder || 0 },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update product line (Admin only)
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, isActive, displayOrder } = req.body;

      const [existing] = await db.query('SELECT * FROM product_lines WHERE id = ?', [id]);
      if ((existing as any[]).length === 0) {
        throw new CustomError('Product line not found', 404);
      }

      // Check for duplicate name if name is being changed
      if (name) {
        const [nameCheck] = await db.query(
          'SELECT id FROM product_lines WHERE name = ? AND id != ?',
          [name, id]
        );
        if ((nameCheck as any[]).length > 0) {
          throw new CustomError('Product line with this name already exists', 409);
        }
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) { updates.push('name = ?'); params.push(name); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive); }
      if (displayOrder !== undefined) { updates.push('display_order = ?'); params.push(displayOrder); }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      params.push(id);
      await db.query(`UPDATE product_lines SET ${updates.join(', ')} WHERE id = ?`, params);

      logger.info({
        message: 'Product line updated',
        productLineId: id,
        updatedBy: req.user?.userId,
      });

      // Return updated record
      const [updated] = await db.query('SELECT * FROM product_lines WHERE id = ?', [id]);
      const row = (updated as any[])[0];

      res.json({
        success: true,
        data: {
          id: row.id,
          name: row.name,
          description: row.description,
          isActive: row.is_active,
          displayOrder: row.display_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete product line (Admin only)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if product line is in use
      const [usage] = await db.query(
        'SELECT COUNT(*) as count FROM tenders WHERE product_line_id = ? AND deleted_at IS NULL',
        [id]
      );

      if ((usage as any[])[0].count > 0) {
        throw new CustomError(
          'Cannot delete product line that is assigned to active leads. Deactivate it instead.',
          400
        );
      }

      await db.query('DELETE FROM product_lines WHERE id = ?', [id]);

      logger.info({
        message: 'Product line deleted',
        productLineId: id,
        deletedBy: req.user?.userId,
      });

      res.json({ success: true, data: { message: 'Product line deleted successfully' } });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get product lines assigned to a specific user
   */
  static async getUserProductLines(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const [rows] = await db.query(
        `SELECT pl.id, pl.name, pl.description, pl.is_active, pl.display_order
         FROM product_lines pl
         INNER JOIN user_product_lines upl ON upl.product_line_id = pl.id
         WHERE upl.user_id = ?
         ORDER BY pl.display_order ASC, pl.name ASC`,
        [userId]
      );

      const productLines = (rows as any[]).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        displayOrder: row.display_order,
      }));

      res.json({ success: true, data: productLines });
    } catch (error: any) {
      next(error);
    }
  }
}
