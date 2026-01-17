import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class CategoryController {
  /**
   * Get all categories
   */
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const [categories] = await db.query(
        `SELECT 
          tc.*,
          COUNT(t.id) as tender_count
         FROM tender_categories tc
         LEFT JOIN tenders t ON tc.id = t.category_id
         WHERE tc.is_active = TRUE
         GROUP BY tc.id
         ORDER BY tc.name ASC`
      );

      const categoriesArray = categories as any[];
      const formattedCategories = categoriesArray.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || null,
        color: cat.color || '#3b82f6',
        icon: cat.icon || null,
        isActive: cat.is_active,
        tenderCount: parseInt(cat.tender_count) || 0,
        createdAt: cat.created_at,
      }));

      res.json({
        success: true,
        data: formattedCategories,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get category by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [categories] = await db.query(
        `SELECT 
          tc.*,
          COUNT(t.id) as tender_count
         FROM tender_categories tc
         LEFT JOIN tenders t ON tc.id = t.category_id
         WHERE tc.id = ? AND tc.is_active = TRUE
         GROUP BY tc.id`,
        [id]
      );

      const categoriesArray = categories as any[];
      if (categoriesArray.length === 0) {
        throw new CustomError('Category not found', 404);
      }

      const cat = categoriesArray[0];
      const formattedCategory = {
        id: cat.id,
        name: cat.name,
        description: cat.description || null,
        color: cat.color || '#3b82f6',
        icon: cat.icon || null,
        isActive: cat.is_active,
        tenderCount: parseInt(cat.tender_count) || 0,
        createdAt: cat.created_at,
      };

      res.json({
        success: true,
        data: formattedCategory,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create category
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, color, icon } = req.body;
      const userId = (req as any).user?.id;

      // Check if category name already exists
      const [existing] = await db.query(
        'SELECT id FROM tender_categories WHERE name = ?',
        [name]
      );

      const existingArray = existing as any[];
      if (existingArray.length > 0) {
        throw new CustomError('Category name already exists', 400);
      }

      const [result] = await db.query(
        `INSERT INTO tender_categories (name, description, color, icon, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [name, description || null, color || '#3b82f6', icon || null, userId || null]
      );

      const insertResult = result as any;
      const categoryId = insertResult.insertId;

      // Get the created category
      const [categories] = await db.query(
        'SELECT * FROM tender_categories WHERE id = ?',
        [categoryId]
      );

      const categoriesArray = categories as any[];
      const cat = categoriesArray[0];

      const formattedCategory = {
        id: cat.id,
        name: cat.name,
        description: cat.description || null,
        color: cat.color || '#3b82f6',
        icon: cat.icon || null,
        isActive: cat.is_active,
        tenderCount: 0,
        createdAt: cat.created_at,
      };

      logger.info({
        message: 'Category created',
        categoryId,
        userId,
      });

      res.status(201).json({
        success: true,
        data: formattedCategory,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update category
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, color, icon, isActive } = req.body;

      // Check if category exists
      const [existing] = await db.query(
        'SELECT id FROM tender_categories WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Category not found', 404);
      }

      // Check if name is being changed and if it conflicts
      if (name) {
        const [nameCheck] = await db.query(
          'SELECT id FROM tender_categories WHERE name = ? AND id != ?',
          [name, id]
        );

        const nameCheckArray = nameCheck as any[];
        if (nameCheckArray.length > 0) {
          throw new CustomError('Category name already exists', 400);
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description || null);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        values.push(color);
      }
      if (icon !== undefined) {
        updates.push('icon = ?');
        values.push(icon || null);
      }
      if (isActive !== undefined) {
        updates.push('is_active = ?');
        values.push(isActive);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      values.push(id);

      await db.query(
        `UPDATE tender_categories SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Get updated category
      const [categories] = await db.query(
        'SELECT * FROM tender_categories WHERE id = ?',
        [id]
      );

      const categoriesArray = categories as any[];
      const cat = categoriesArray[0];

      // Get tender count
      const [countResult] = await db.query(
        'SELECT COUNT(*) as count FROM tenders WHERE category_id = ?',
        [id]
      );

      const countArray = countResult as any[];
      const tenderCount = parseInt(countArray[0]?.count) || 0;

      const formattedCategory = {
        id: cat.id,
        name: cat.name,
        description: cat.description || null,
        color: cat.color || '#3b82f6',
        icon: cat.icon || null,
        isActive: cat.is_active,
        tenderCount,
        createdAt: cat.created_at,
      };

      logger.info({
        message: 'Category updated',
        categoryId: id,
      });

      res.json({
        success: true,
        data: formattedCategory,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete category (soft delete by setting is_active = false)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if category exists
      const [existing] = await db.query(
        'SELECT id FROM tender_categories WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Category not found', 404);
      }

      // Check if category is used by any tenders
      const [tenders] = await db.query(
        'SELECT COUNT(*) as count FROM tenders WHERE category_id = ?',
        [id]
      );

      const tendersArray = tenders as any[];
      const tenderCount = parseInt(tendersArray[0]?.count) || 0;

      if (tenderCount > 0) {
        throw new CustomError(
          `Cannot delete category. It is used by ${tenderCount} tender(s).`,
          400
        );
      }

      // Soft delete
      await db.query(
        'UPDATE tender_categories SET is_active = FALSE WHERE id = ?',
        [id]
      );

      logger.info({
        message: 'Category deleted',
        categoryId: id,
      });

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }
}

