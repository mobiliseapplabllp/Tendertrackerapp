import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { deleteMaterialFile, getMaterialFilePath } from '../services/collateralFileService';
import logger from '../utils/logger';

export class CollateralController {

  // ==================== CATEGORIES ====================

  /**
   * Get all collateral categories with item counts
   */
  static async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const [categories] = await db.query(`
        SELECT cc.*,
               COUNT(ci.id) as item_count
        FROM collateral_categories cc
        LEFT JOIN collateral_items ci ON ci.category_id = cc.id AND ci.deleted_at IS NULL
        WHERE cc.is_active = TRUE
        GROUP BY cc.id
        ORDER BY cc.sort_order ASC
      `);

      res.json({ success: true, data: categories });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, icon } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const [result] = await db.query(
        `INSERT INTO collateral_categories (name, slug, description, icon, sort_order)
         VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM collateral_categories cc2))`,
        [name, slug, description || null, icon || 'folder']
      );

      const insertId = (result as any).insertId;
      const [newCat] = await db.query('SELECT * FROM collateral_categories WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newCat as any[])[0] });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return next(new CustomError('Category with this name already exists', 409));
      }
      next(error);
    }
  }

  // ==================== COLLATERAL ITEMS ====================

  /**
   * Get all collateral items with filters
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const categoryId = req.query.categoryId as string;
      const tagId = req.query.tagId as string;
      const tagType = req.query.tagType as string;
      const fileType = req.query.fileType as string;
      const isFeatured = req.query.isFeatured as string;
      const sortBy = (req.query.sortBy as string) || 'created_at';
      const sortOrder = (req.query.sortOrder as string) || 'DESC';

      const offset = (page - 1) * pageSize;
      let whereClause = 'ci.deleted_at IS NULL';
      const params: any[] = [];

      if (categoryId) {
        whereClause += ' AND ci.category_id = ?';
        params.push(categoryId);
      }

      if (fileType) {
        whereClause += ' AND ci.file_type LIKE ?';
        params.push(`${fileType}%`);
      }

      if (isFeatured === 'true') {
        whereClause += ' AND ci.is_featured = TRUE';
      }

      if (tagId) {
        whereClause += ' AND ci.id IN (SELECT collateral_id FROM collateral_item_tags WHERE tag_id = ?)';
        params.push(tagId);
      }

      if (tagType) {
        whereClause += ` AND ci.id IN (
          SELECT cit.collateral_id FROM collateral_item_tags cit
          JOIN collateral_tags ct ON ct.id = cit.tag_id
          WHERE ct.tag_type = ?
        )`;
        params.push(tagType);
      }

      // Validate sort column to prevent SQL injection
      const allowedSortColumns = ['created_at', 'title', 'file_size', 'download_count', 'updated_at'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const [items] = await db.query(`
        SELECT ci.*,
               cc.name as category_name, cc.slug as category_slug,
               u.full_name as uploaded_by_name,
               COUNT(*) OVER() as total
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        WHERE ${whereClause}
        ORDER BY ci.${safeSortBy} ${safeSortOrder}
        LIMIT ? OFFSET ?
      `, [...params, pageSize, offset]);

      const itemsArray = items as any[];
      const total = itemsArray.length > 0 ? itemsArray[0].total : 0;

      // Fetch tags for all returned items
      if (itemsArray.length > 0) {
        const itemIds = itemsArray.map((i: any) => i.id);
        const placeholders = itemIds.map(() => '?').join(',');
        const [tags] = await db.query(`
          SELECT cit.collateral_id, ct.id as tag_id, ct.name as tag_name, ct.tag_type
          FROM collateral_item_tags cit
          JOIN collateral_tags ct ON ct.id = cit.tag_id
          WHERE cit.collateral_id IN (${placeholders})
        `, itemIds);

        const tagMap: Record<number, any[]> = {};
        (tags as any[]).forEach((t: any) => {
          if (!tagMap[t.collateral_id]) tagMap[t.collateral_id] = [];
          tagMap[t.collateral_id].push({ id: t.tag_id, name: t.tag_name, type: t.tag_type });
        });

        itemsArray.forEach((item: any) => {
          item.tags = tagMap[item.id] || [];
        });
      }

      res.json({
        success: true,
        data: {
          data: itemsArray,
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
   * Get a single collateral item by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [items] = await db.query(`
        SELECT ci.*,
               cc.name as category_name, cc.slug as category_slug,
               u.full_name as uploaded_by_name
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        WHERE ci.id = ? AND ci.deleted_at IS NULL
      `, [id]);

      const itemsArray = items as any[];
      if (itemsArray.length === 0) {
        throw new CustomError('Collateral item not found', 404);
      }

      // Get tags
      const [tags] = await db.query(`
        SELECT ct.id, ct.name, ct.tag_type
        FROM collateral_item_tags cit
        JOIN collateral_tags ct ON ct.id = cit.tag_id
        WHERE cit.collateral_id = ?
      `, [id]);

      const item = itemsArray[0];
      item.tags = tags;

      res.json({ success: true, data: item });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Upload a new collateral item
   */
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw new CustomError('No file uploaded', 400);
      }

      const { title, description, categoryId, tags, isFeatured } = req.body;

      if (!title || !categoryId) {
        // Clean up uploaded file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new CustomError('Title and category are required', 400);
      }

      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileType = file.mimetype;

      const [result] = await db.query(`
        INSERT INTO collateral_items
          (title, description, category_id, file_name, original_name, file_path, file_type, file_size, file_extension, is_featured, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title,
        description || null,
        categoryId,
        file.filename,
        file.originalname,
        file.filename, // Just the filename, not full path
        fileType,
        file.size,
        fileExtension,
        isFeatured === 'true' || isFeatured === true ? true : false,
        req.user!.userId,
      ]);

      const insertId = (result as any).insertId;

      // Handle tags (comma-separated tag IDs)
      if (tags) {
        const tagIds = typeof tags === 'string' ? tags.split(',').map(Number).filter(Boolean) : [];
        for (const tagId of tagIds) {
          try {
            await db.query(
              'INSERT INTO collateral_item_tags (collateral_id, tag_id) VALUES (?, ?)',
              [insertId, tagId]
            );
          } catch (tagError: any) {
            logger.warn({ message: 'Failed to add tag', tagId, error: tagError.message });
          }
        }
      }

      // Return the created item
      const [newItem] = await db.query(`
        SELECT ci.*, cc.name as category_name, u.full_name as uploaded_by_name
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        WHERE ci.id = ?
      `, [insertId]);

      res.status(201).json({ success: true, data: (newItem as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a collateral item
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { title, description, categoryId, tags, isFeatured } = req.body;
      const file = req.file;

      // Check item exists
      const [existing] = await db.query(
        'SELECT * FROM collateral_items WHERE id = ? AND deleted_at IS NULL', [id]
      );
      if ((existing as any[]).length === 0) {
        if (file && file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new CustomError('Collateral item not found', 404);
      }

      const existingItem = (existing as any[])[0];

      // Build dynamic update
      const updates: string[] = [];
      const params: any[] = [];

      if (title !== undefined) { updates.push('title = ?'); params.push(title); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(parseInt(String(categoryId))); }
      if (isFeatured !== undefined) { updates.push('is_featured = ?'); params.push(isFeatured === 'true' || isFeatured === true); }

      // Handle file replacement
      if (file) {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const currentVersion = existingItem.current_version || 1;
        const newVersion = currentVersion + 1;

        // Save current file as a version record before replacing
        try {
          await db.query(`
            INSERT INTO collateral_versions
              (collateral_id, version_number, file_name, original_name, file_path, file_type, file_size, file_extension, change_note, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            currentVersion,
            existingItem.file_name,
            existingItem.original_name,
            existingItem.file_path || existingItem.file_name,
            existingItem.file_type,
            existingItem.file_size,
            existingItem.file_extension,
            'Replaced by newer version',
            req.user!.userId,
          ]);
        } catch (versionError: any) {
          logger.warn({ message: 'Failed to save version history', error: versionError.message });
        }

        // Update file fields
        updates.push('file_name = ?'); params.push(file.filename);
        updates.push('original_name = ?'); params.push(file.originalname);
        updates.push('file_path = ?'); params.push(file.filename);
        updates.push('file_type = ?'); params.push(file.mimetype);
        updates.push('file_size = ?'); params.push(file.size);
        updates.push('file_extension = ?'); params.push(fileExtension);
        updates.push('current_version = ?'); params.push(newVersion);

        // Delete old file from disk
        try {
          await deleteMaterialFile(existingItem.file_name);
        } catch (fileError: any) {
          logger.warn({ message: 'Could not delete old material file', error: fileError.message });
        }
      }

      if (updates.length > 0) {
        params.push(id);
        await db.query(
          `UPDATE collateral_items SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      // Update tags if provided
      if (tags !== undefined) {
        await db.query('DELETE FROM collateral_item_tags WHERE collateral_id = ?', [id]);
        const tagIds = typeof tags === 'string' ? tags.split(',').map(Number).filter(Boolean) : (Array.isArray(tags) ? tags : []);
        for (const tagId of tagIds) {
          try {
            await db.query(
              'INSERT INTO collateral_item_tags (collateral_id, tag_id) VALUES (?, ?)',
              [id, tagId]
            );
          } catch (tagError: any) {
            logger.warn({ message: 'Failed to update tag', tagId, error: tagError.message });
          }
        }
      }

      // Return updated item
      const [updated] = await db.query(`
        SELECT ci.*, cc.name as category_name, u.full_name as uploaded_by_name
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        WHERE ci.id = ?
      `, [id]);

      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Soft delete a collateral item
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [existing] = await db.query(
        'SELECT * FROM collateral_items WHERE id = ? AND deleted_at IS NULL', [id]
      );
      if ((existing as any[]).length === 0) {
        throw new CustomError('Collateral item not found', 404);
      }

      // Soft delete
      await db.query('UPDATE collateral_items SET deleted_at = NOW() WHERE id = ?', [id]);

      // Optionally delete the file too
      try {
        const item = (existing as any[])[0];
        await deleteMaterialFile(item.file_name);
      } catch (fileError: any) {
        logger.warn({ message: 'Could not delete material file', error: fileError.message });
      }

      res.json({ success: true, message: 'Collateral item deleted' });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Download / serve a collateral file
   */
  static async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [items] = await db.query(
        'SELECT * FROM collateral_items WHERE id = ? AND deleted_at IS NULL', [id]
      );
      if ((items as any[]).length === 0) {
        throw new CustomError('Collateral item not found', 404);
      }

      const item = (items as any[])[0];
      const filePath = getMaterialFilePath(item.file_name);

      if (!fs.existsSync(filePath)) {
        throw new CustomError('File not found on disk', 404);
      }

      // Increment download count
      await db.query('UPDATE collateral_items SET download_count = download_count + 1 WHERE id = ?', [id]);

      // If inline preview requested, serve with Content-Type for browser rendering
      const inline = req.query.inline === 'true' || req.headers.accept?.includes('text/html');
      if (inline || req.query.preview) {
        const absolutePath = require('path').resolve(filePath);
        res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${item.original_name}"`);
        return res.sendFile(absolutePath);
      }

      res.download(filePath, item.original_name);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get version history for a collateral item
   */
  static async getVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify item exists
      const [items] = await db.query(
        'SELECT id, current_version FROM collateral_items WHERE id = ? AND deleted_at IS NULL', [id]
      );
      if ((items as any[]).length === 0) {
        throw new CustomError('Collateral item not found', 404);
      }

      const [versions] = await db.query(`
        SELECT cv.*, u.full_name as uploaded_by_name
        FROM collateral_versions cv
        LEFT JOIN users u ON cv.uploaded_by = u.id
        WHERE cv.collateral_id = ?
        ORDER BY cv.version_number DESC
      `, [id]);

      res.json({
        success: true,
        data: {
          currentVersion: (items as any[])[0].current_version || 1,
          versions: versions,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== TAGS ====================

  /**
   * Get all tags with usage counts
   */
  static async getTags(req: Request, res: Response, next: NextFunction) {
    try {
      const tagType = req.query.type as string;
      let whereClause = '1=1';
      const params: any[] = [];

      if (tagType) {
        whereClause += ' AND ct.tag_type = ?';
        params.push(tagType);
      }

      const [tags] = await db.query(`
        SELECT ct.*, COUNT(cit.collateral_id) as usage_count
        FROM collateral_tags ct
        LEFT JOIN collateral_item_tags cit ON ct.id = cit.tag_id
        WHERE ${whereClause}
        GROUP BY ct.id
        ORDER BY ct.tag_type, ct.name
      `, params);

      res.json({ success: true, data: tags });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new tag
   */
  static async createTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, tagType } = req.body;

      if (!name || !tagType) {
        throw new CustomError('Name and tag type are required', 400);
      }

      const [result] = await db.query(
        'INSERT INTO collateral_tags (name, tag_type) VALUES (?, ?)',
        [name, tagType]
      );

      const insertId = (result as any).insertId;
      const [newTag] = await db.query('SELECT * FROM collateral_tags WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newTag as any[])[0] });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return next(new CustomError('Tag with this name and type already exists', 409));
      }
      next(error);
    }
  }

  /**
   * Delete a tag
   */
  static async deleteTag(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM collateral_item_tags WHERE tag_id = ?', [id]);
      await db.query('DELETE FROM collateral_tags WHERE id = ?', [id]);
      res.json({ success: true, message: 'Tag deleted' });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== SEARCH ====================

  /**
   * Full-text search across collateral
   */
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      if (!query || query.trim().length === 0) {
        throw new CustomError('Search query is required', 400);
      }

      const searchTerm = `%${query.trim()}%`;

      const [items] = await db.query(`
        SELECT ci.*,
               cc.name as category_name, cc.slug as category_slug,
               u.full_name as uploaded_by_name,
               COUNT(*) OVER() as total
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        WHERE ci.deleted_at IS NULL
          AND (
            ci.title LIKE ?
            OR ci.description LIKE ?
            OR ci.original_name LIKE ?
            OR ci.id IN (
              SELECT cit.collateral_id
              FROM collateral_item_tags cit
              JOIN collateral_tags ct ON ct.id = cit.tag_id
              WHERE ct.name LIKE ?
            )
          )
        ORDER BY ci.created_at DESC
        LIMIT ? OFFSET ?
      `, [searchTerm, searchTerm, searchTerm, searchTerm, pageSize, offset]);

      const itemsArray = items as any[];
      const total = itemsArray.length > 0 ? itemsArray[0].total : 0;

      // Fetch tags for results
      if (itemsArray.length > 0) {
        const itemIds = itemsArray.map((i: any) => i.id);
        const placeholders = itemIds.map(() => '?').join(',');
        const [tags] = await db.query(`
          SELECT cit.collateral_id, ct.id as tag_id, ct.name as tag_name, ct.tag_type
          FROM collateral_item_tags cit
          JOIN collateral_tags ct ON ct.id = cit.tag_id
          WHERE cit.collateral_id IN (${placeholders})
        `, itemIds);

        const tagMap: Record<number, any[]> = {};
        (tags as any[]).forEach((t: any) => {
          if (!tagMap[t.collateral_id]) tagMap[t.collateral_id] = [];
          tagMap[t.collateral_id].push({ id: t.tag_id, name: t.tag_name, type: t.tag_type });
        });

        itemsArray.forEach((item: any) => {
          item.tags = tagMap[item.id] || [];
        });
      }

      res.json({
        success: true,
        data: {
          data: itemsArray,
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

  // ==================== DASHBOARD STATS ====================

  /**
   * Get collateral dashboard stats
   */
  static async getDashboardStats(_req: Request, res: Response, next: NextFunction) {
    try {
      // Total items
      const [totalResult] = await db.query(
        'SELECT COUNT(*) as total FROM collateral_items WHERE deleted_at IS NULL'
      );
      const totalItems = (totalResult as any[])[0].total;

      // Items by category
      const [byCategory] = await db.query(`
        SELECT cc.name, cc.slug, cc.icon, COUNT(ci.id) as count
        FROM collateral_categories cc
        LEFT JOIN collateral_items ci ON ci.category_id = cc.id AND ci.deleted_at IS NULL
        WHERE cc.is_active = TRUE
        GROUP BY cc.id
        ORDER BY cc.sort_order
      `);

      // Items by file type category
      const [byFileType] = await db.query(`
        SELECT
          CASE
            WHEN file_type LIKE 'image/%' THEN 'Images'
            WHEN file_type LIKE 'video/%' THEN 'Videos'
            WHEN file_type LIKE '%pdf%' THEN 'PDFs'
            WHEN file_type LIKE '%presentation%' OR file_type LIKE '%powerpoint%' THEN 'Presentations'
            WHEN file_type LIKE '%spreadsheet%' OR file_type LIKE '%excel%' THEN 'Spreadsheets'
            WHEN file_type LIKE '%word%' OR file_type LIKE '%document%' THEN 'Documents'
            ELSE 'Other'
          END as type_category,
          COUNT(*) as count
        FROM collateral_items
        WHERE deleted_at IS NULL
        GROUP BY type_category
      `);

      // Total storage used
      const [storageResult] = await db.query(
        'SELECT COALESCE(SUM(file_size), 0) as total_size FROM collateral_items WHERE deleted_at IS NULL'
      );
      const totalStorageBytes = (storageResult as any[])[0].total_size;

      // Most downloaded
      const [topDownloaded] = await db.query(`
        SELECT id, title, download_count, category_id
        FROM collateral_items
        WHERE deleted_at IS NULL AND download_count > 0
        ORDER BY download_count DESC
        LIMIT 5
      `);

      // Recent uploads
      const [recentUploads] = await db.query(`
        SELECT ci.id, ci.title, ci.file_type, ci.file_extension, ci.created_at,
               cc.name as category_name, u.full_name as uploaded_by_name
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        WHERE ci.deleted_at IS NULL
        ORDER BY ci.created_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          totalItems,
          totalStorageBytes,
          totalStorageMB: Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100,
          byCategory,
          byFileType,
          topDownloaded,
          recentUploads,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}
