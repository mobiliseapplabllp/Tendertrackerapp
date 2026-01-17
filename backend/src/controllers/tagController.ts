import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class TagController {
  /**
   * Get all tags
   */
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const [tags] = await db.query(
        `SELECT 
          tt.*,
          COUNT(ttr.tender_id) as usage_count
         FROM tender_tags tt
         LEFT JOIN tender_tag_relations ttr ON tt.id = ttr.tag_id
         GROUP BY tt.id
         ORDER BY tt.name ASC`
      );

      const tagsArray = tags as any[];
      const formattedTags = tagsArray.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || null,
        usageCount: parseInt(tag.usage_count) || 0,
        createdAt: tag.created_at,
      }));

      res.json({
        success: true,
        data: formattedTags,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get tag by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [tags] = await db.query(
        `SELECT 
          tt.*,
          COUNT(ttr.tender_id) as usage_count
         FROM tender_tags tt
         LEFT JOIN tender_tag_relations ttr ON tt.id = ttr.tag_id
         WHERE tt.id = ?
         GROUP BY tt.id`,
        [id]
      );

      const tagsArray = tags as any[];
      if (tagsArray.length === 0) {
        throw new CustomError('Tag not found', 404);
      }

      const tag = tagsArray[0];
      const formattedTag = {
        id: tag.id,
        name: tag.name,
        color: tag.color || null,
        usageCount: parseInt(tag.usage_count) || 0,
        createdAt: tag.created_at,
      };

      res.json({
        success: true,
        data: formattedTag,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create tag
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, color } = req.body;

      // Check if tag name already exists
      const [existing] = await db.query(
        'SELECT id FROM tender_tags WHERE name = ?',
        [name]
      );

      const existingArray = existing as any[];
      if (existingArray.length > 0) {
        throw new CustomError('Tag name already exists', 400);
      }

      const [result] = await db.query(
        `INSERT INTO tender_tags (name, color)
         VALUES (?, ?)`,
        [name, color || null]
      );

      const insertResult = result as any;
      const tagId = insertResult.insertId;

      // Get the created tag
      const [tags] = await db.query(
        'SELECT * FROM tender_tags WHERE id = ?',
        [tagId]
      );

      const tagsArray = tags as any[];
      const tag = tagsArray[0];

      const formattedTag = {
        id: tag.id,
        name: tag.name,
        color: tag.color || null,
        usageCount: 0,
        createdAt: tag.created_at,
      };

      logger.info({
        message: 'Tag created',
        tagId,
      });

      res.status(201).json({
        success: true,
        data: formattedTag,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update tag
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, color } = req.body;

      // Check if tag exists
      const [existing] = await db.query(
        'SELECT id FROM tender_tags WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Tag not found', 404);
      }

      // Check if name is being changed and if it conflicts
      if (name) {
        const [nameCheck] = await db.query(
          'SELECT id FROM tender_tags WHERE name = ? AND id != ?',
          [name, id]
        );

        const nameCheckArray = nameCheck as any[];
        if (nameCheckArray.length > 0) {
          throw new CustomError('Tag name already exists', 400);
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        values.push(color || null);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      values.push(id);

      await db.query(
        `UPDATE tender_tags SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Get updated tag
      const [tags] = await db.query(
        'SELECT * FROM tender_tags WHERE id = ?',
        [id]
      );

      const tagsArray = tags as any[];
      const tag = tagsArray[0];

      // Get usage count
      const [countResult] = await db.query(
        'SELECT COUNT(*) as count FROM tender_tag_relations WHERE tag_id = ?',
        [id]
      );

      const countArray = countResult as any[];
      const usageCount = parseInt(countArray[0]?.count) || 0;

      const formattedTag = {
        id: tag.id,
        name: tag.name,
        color: tag.color || null,
        usageCount,
        createdAt: tag.created_at,
      };

      logger.info({
        message: 'Tag updated',
        tagId: id,
      });

      res.json({
        success: true,
        data: formattedTag,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete tag
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if tag exists
      const [existing] = await db.query(
        'SELECT id FROM tender_tags WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Tag not found', 404);
      }

      // Delete tag relations first (cascade should handle this, but being explicit)
      await db.query(
        'DELETE FROM tender_tag_relations WHERE tag_id = ?',
        [id]
      );

      // Delete tag
      await db.query('DELETE FROM tender_tags WHERE id = ?', [id]);

      logger.info({
        message: 'Tag deleted',
        tagId: id,
      });

      res.json({
        success: true,
        message: 'Tag deleted successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }
}

