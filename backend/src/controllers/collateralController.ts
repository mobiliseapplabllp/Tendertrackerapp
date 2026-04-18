import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { deleteMaterialFile, getMaterialFilePath } from '../services/collateralFileService';
import { emailService } from '../services/emailService';
import { getCompanyName } from '../utils/settings';
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
      const productLineId = req.query.productLineId as string;
      const productId = req.query.productId as string;
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

      if (productLineId) {
        whereClause += ' AND ci.product_line_id = ?';
        params.push(productLineId);
      }

      if (productId) {
        whereClause += ' AND ci.product_id = ?';
        params.push(productId);
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
               pl.name as product_line_name,
               p.name as product_name, p.sku as product_sku,
               COUNT(*) OVER() as total
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        LEFT JOIN product_lines pl ON ci.product_line_id = pl.id
        LEFT JOIN products p ON ci.product_id = p.id
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
               u.full_name as uploaded_by_name,
               pl.name as product_line_name,
               p.name as product_name, p.sku as product_sku
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN users u ON ci.uploaded_by = u.id
        LEFT JOIN product_lines pl ON ci.product_line_id = pl.id
        LEFT JOIN products p ON ci.product_id = p.id
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

      const { title, description, categoryId, tags, isFeatured, productLineId, productId } = req.body;

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
          (title, description, category_id, product_line_id, product_id, file_name, original_name, file_path, file_type, file_size, file_extension, is_featured, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title,
        description || null,
        categoryId,
        productLineId ? parseInt(String(productLineId)) : null,
        productId ? parseInt(String(productId)) : null,
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
      const { title, description, categoryId, tags, isFeatured, productLineId, productId } = req.body;
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
      if (productLineId !== undefined) { updates.push('product_line_id = ?'); params.push(productLineId ? parseInt(String(productLineId)) : null); }
      if (productId !== undefined) { updates.push('product_id = ?'); params.push(productId ? parseInt(String(productId)) : null); }

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
      const inline = req.query.inline === 'true' || req.query.preview === 'true';
      if (inline) {
        const absolutePath = path.resolve(filePath);
        res.setHeader('Content-Type', item.file_type || 'application/octet-stream');
        const safeName = (item.original_name || 'file').replace(/[\r\n"\\;]/g, '_');
        res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
        return res.sendFile(absolutePath);
      }

      const safeName = (item.original_name || 'file').replace(/[\r\n"\\;]/g, '_');
      res.download(filePath, safeName);
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

  // ==================== SHARING ====================

  /**
   * Create a public sharing link for a collateral item
   */
  static async createPublicLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { collateralId, expiresInDays } = req.body;
      const userId = req.user!.userId;

      // Verify collateral item exists
      const [items] = await db.query(
        'SELECT id, title FROM collateral_items WHERE id = ? AND deleted_at IS NULL', [collateralId]
      );
      if ((items as any[]).length === 0) {
        throw new CustomError('Collateral item not found', 404);
      }

      // Generate a unique share token
      const token = crypto.randomBytes(32).toString('hex');

      // Calculate expiry date if provided
      let expiresAt: Date | null = null;
      if (expiresInDays && expiresInDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(String(expiresInDays)));
      }

      const [result] = await db.query(
        `INSERT INTO collateral_public_links (collateral_id, share_token, created_by, expires_at)
         VALUES (?, ?, ?, ?)`,
        [collateralId, token, userId, expiresAt]
      );

      const insertId = (result as any).insertId;
      const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'https://tendertracker.mobilisepro.com';
      const shareUrl = `${appUrl}/api/v1/shared/${token}`;

      const [newLink] = await db.query('SELECT * FROM collateral_public_links WHERE id = ?', [insertId]);

      res.status(201).json({
        success: true,
        data: {
          ...(newLink as any[])[0],
          shareUrl,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get existing active public links for a collateral item
   */
  static async getPublicLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { collateralId } = req.params;

      const [links] = await db.query(`
        SELECT cpl.*, u.full_name as created_by_name
        FROM collateral_public_links cpl
        LEFT JOIN users u ON cpl.created_by = u.id
        WHERE cpl.collateral_id = ? AND cpl.is_active = TRUE
        ORDER BY cpl.created_at DESC
      `, [collateralId]);

      const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'https://tendertracker.mobilisepro.com';
      const linksArray = (links as any[]).map((link: any) => ({
        ...link,
        shareUrl: `${appUrl}/api/v1/shared/${link.share_token}`,
      }));

      res.json({ success: true, data: linksArray });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Log a share action (e.g. copy link, WhatsApp, LinkedIn, etc.)
   */
  static async logShare(req: Request, res: Response, next: NextFunction) {
    try {
      const { collateralId, channel, recipientInfo, shareToken, sentAsAttachment } = req.body;
      const userId = req.user!.userId;

      // Verify collateral item exists
      const [items] = await db.query(
        'SELECT id FROM collateral_items WHERE id = ? AND deleted_at IS NULL', [collateralId]
      );
      if ((items as any[]).length === 0) {
        throw new CustomError('Collateral item not found', 404);
      }

      await db.query(
        `INSERT INTO collateral_share_log (collateral_id, shared_by, channel, recipient_info, share_token, sent_as_attachment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [collateralId, userId, channel, recipientInfo || null, shareToken || null, sentAsAttachment ? true : false]
      );

      res.json({ success: true, message: 'Share logged successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get share history for a collateral item
   */
  static async getShareHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { collateralId } = req.params;

      const [history] = await db.query(`
        SELECT csl.*, u.full_name as shared_by_name
        FROM collateral_share_log csl
        LEFT JOIN users u ON csl.shared_by = u.id
        WHERE csl.collateral_id = ?
        ORDER BY csl.created_at DESC
      `, [collateralId]);

      res.json({ success: true, data: history });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Public view of a shared collateral item (NO AUTH REQUIRED)
   */
  static async publicView(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      // Look up the public link
      const [links] = await db.query(`
        SELECT cpl.*, ci.title, ci.description, ci.file_type, ci.file_extension, ci.file_size,
               ci.original_name, ci.file_name,
               cc.name as category_name,
               pl.name as product_line_name,
               p.name as product_name
        FROM collateral_public_links cpl
        JOIN collateral_items ci ON cpl.collateral_id = ci.id AND ci.deleted_at IS NULL
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN product_lines pl ON ci.product_line_id = pl.id
        LEFT JOIN products p ON ci.product_id = p.id
        WHERE cpl.share_token = ? AND cpl.is_active = TRUE
      `, [token]);

      if ((links as any[]).length === 0) {
        res.status(404).send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f3f4f6"><div style="text-align:center"><h2>Not Found</h2><p style="color:#6b7280">This shared link is invalid or has been deactivated.</p></div></body></html>');
        return;
      }

      const link = (links as any[])[0];

      // Check expiry
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        res.status(410).send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f3f4f6"><div style="text-align:center"><h2>Link Expired</h2><p style="color:#6b7280">This shared link has expired.</p></div></body></html>');
        return;
      }

      // Increment view count
      await db.query(
        'UPDATE collateral_public_links SET view_count = view_count + 1 WHERE id = ?',
        [link.id]
      );

      // Log the view
      await db.query(
        `INSERT INTO collateral_link_views (public_link_id, ip_address, user_agent, action)
         VALUES (?, ?, ?, 'view')`,
        [link.id, req.ip || null, req.get('user-agent') || null]
      );

      // Serve a self-contained HTML download page
      const fileSizeMB = (link.file_size / (1024 * 1024)).toFixed(1);
      const downloadUrl = `/api/v1/shared/${token}/download`;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${link.title} - Mobilise CRM</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;width:100%;overflow:hidden}
    .header{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:32px 24px;text-align:center}
    .header h1{font-size:14px;font-weight:500;opacity:.85;margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase}
    .header h2{font-size:22px;font-weight:700;line-height:1.3}
    .body{padding:24px}
    .meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
    .badge{background:#f0f0ff;color:#4f46e5;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
    .badge.green{background:#ecfdf5;color:#059669}
    .desc{color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:24px}
    .file-info{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px;margin-bottom:24px}
    .file-icon{width:48px;height:48px;background:#eef2ff;border-radius:10px;display:flex;align-items:center;justify-content:center}
    .file-icon svg{width:24px;height:24px;color:#4f46e5}
    .file-name{font-weight:600;font-size:14px;color:#1f2937}
    .file-meta{font-size:12px;color:#9ca3af;margin-top:2px}
    .btn{display:block;width:100%;padding:14px;background:#4f46e5;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;text-align:center;text-decoration:none;transition:background .2s}
    .btn:hover{background:#4338ca}
    .footer{text-align:center;padding:16px 24px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Shared Document</h1>
      <h2>${link.title}</h2>
    </div>
    <div class="body">
      <div class="meta">
        ${link.category_name ? `<span class="badge">${link.category_name}</span>` : ''}
        ${link.product_line_name ? `<span class="badge green">${link.product_line_name}</span>` : ''}
        <span class="badge">${(link.file_extension || '').toUpperCase()} &middot; ${fileSizeMB} MB</span>
      </div>
      ${link.description ? `<p class="desc">${link.description}</p>` : ''}
      <div class="file-info">
        <div class="file-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
        </div>
        <div>
          <div class="file-name">${link.original_name}</div>
          <div class="file-meta">${fileSizeMB} MB &middot; ${(link.file_extension || '').toUpperCase()}</div>
        </div>
      </div>
      <a href="${downloadUrl}" class="btn">Download File</a>
    </div>
    <div class="footer">Shared via Mobilise CRM</div>
  </div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Public download of a shared collateral file (NO AUTH REQUIRED)
   */
  static async publicDownload(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      // Look up the public link
      const [links] = await db.query(`
        SELECT cpl.*, ci.file_name, ci.original_name, ci.file_type
        FROM collateral_public_links cpl
        JOIN collateral_items ci ON cpl.collateral_id = ci.id AND ci.deleted_at IS NULL
        WHERE cpl.share_token = ? AND cpl.is_active = TRUE
      `, [token]);

      if ((links as any[]).length === 0) {
        throw new CustomError('Shared link not found or has been deactivated', 404);
      }

      const link = (links as any[])[0];

      // Check expiry
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        res.status(410).send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f3f4f6"><div style="text-align:center"><h2>Link Expired</h2><p style="color:#6b7280">This shared link has expired.</p></div></body></html>');
        return;
      }

      const filePath = getMaterialFilePath(link.file_name);
      if (!fs.existsSync(filePath)) {
        throw new CustomError('File not found on disk', 404);
      }

      // Increment download count on the public link
      await db.query(
        'UPDATE collateral_public_links SET download_count = download_count + 1 WHERE id = ?',
        [link.id]
      );

      // Also increment the collateral item's download count
      await db.query(
        'UPDATE collateral_items SET download_count = download_count + 1 WHERE id = ?',
        [link.collateral_id]
      );

      // Log the download
      await db.query(
        `INSERT INTO collateral_link_views (public_link_id, ip_address, user_agent, action)
         VALUES (?, ?, ?, 'download')`,
        [link.id, req.ip || null, req.get('user-agent') || null]
      );

      res.download(filePath, link.original_name);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * AI-generate a professional email draft for sharing collateral
   */
  static async aiGenerateShareEmailDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const { collateralId } = req.body;
      if (!collateralId) throw new CustomError('Collateral ID required', 400);

      // Fetch collateral with product/category info
      const [items] = await db.query(`
        SELECT ci.*, cc.name as category_name,
               pl.name as product_line_name,
               p.name as product_name, p.sku as product_sku
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        LEFT JOIN product_lines pl ON ci.product_line_id = pl.id
        LEFT JOIN products p ON ci.product_id = p.id
        WHERE ci.id = ? AND ci.deleted_at IS NULL
      `, [collateralId]);

      if ((items as any[]).length === 0) throw new CustomError('Collateral not found', 404);
      const item = (items as any[])[0];

      const senderName = req.user?.fullName || 'Team';
      const companyName = await getCompanyName();
      const categoryLabel = item.category_name || 'Document';
      const productInfo = item.product_line_name
        ? `${item.product_line_name}${item.product_name ? ' - ' + item.product_name : ''}`
        : '';

      const subject = `${categoryLabel}: ${item.title} | ${companyName}`;

      const body = `Dear Sir/Madam,

I hope this message finds you well.

I am sharing our ${categoryLabel.toLowerCase()} — "${item.title}"${productInfo ? ` for ${productInfo}` : ''} — which I believe will be of interest to you.

${item.description ? `Overview:\n${item.description}\n` : ''}This document provides valuable insights into our capabilities and solutions. Please find it attached for your review, or use the link below to access it directly.

Should you have any questions or need further information, please do not hesitate to reach out. I would be happy to schedule a call to discuss in more detail.

Looking forward to your thoughts.

Best regards,
${senderName}
${companyName}`;

      res.json({
        success: true,
        data: { subject, body }
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get collateral items from the same product line (for "attach more" feature)
   */
  static async getSameProductLineItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { collateralId } = req.params;

      // Get current item's product_line_id
      const [current] = await db.query(
        'SELECT product_line_id FROM collateral_items WHERE id = ? AND deleted_at IS NULL',
        [collateralId]
      );
      if ((current as any[]).length === 0) throw new CustomError('Item not found', 404);

      const productLineId = (current as any[])[0].product_line_id;
      if (!productLineId) {
        res.json({ success: true, data: [] });
        return;
      }

      const [items] = await db.query(`
        SELECT ci.id, ci.title, ci.original_name, ci.file_type, ci.file_size, ci.file_extension,
               cc.name as category_name
        FROM collateral_items ci
        LEFT JOIN collateral_categories cc ON ci.category_id = cc.id
        WHERE ci.product_line_id = ? AND ci.id != ? AND ci.deleted_at IS NULL
        ORDER BY ci.title ASC
        LIMIT 50
      `, [productLineId, collateralId]);

      res.json({ success: true, data: items });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send collateral via email (with optional file attachments including additional collateral)
   */
  static async sendShareEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { collateralId, to, cc, subject, body, attachFile, additionalCollateralIds } = req.body;
      const userId = req.user!.userId;

      // Fetch primary collateral item
      const [items] = await db.query(
        'SELECT * FROM collateral_items WHERE id = ? AND deleted_at IS NULL', [collateralId]
      );
      if ((items as any[]).length === 0) {
        throw new CustomError('Collateral item not found', 404);
      }
      const item = (items as any[])[0];

      const attachments: Array<{ filename: string; path?: string; contentType?: string }> = [];

      // Attach primary file
      if (attachFile) {
        const filePath = getMaterialFilePath(item.file_name);
        if (fs.existsSync(filePath)) {
          attachments.push({
            filename: item.original_name,
            path: path.resolve(filePath),
            contentType: item.file_type,
          });
        }
      }

      // Attach additional collateral files
      if (additionalCollateralIds && Array.isArray(additionalCollateralIds) && additionalCollateralIds.length > 0) {
        const placeholders = additionalCollateralIds.map(() => '?').join(',');
        const [addItems] = await db.query(
          `SELECT * FROM collateral_items WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
          additionalCollateralIds
        );
        for (const addItem of (addItems as any[])) {
          const addFilePath = getMaterialFilePath(addItem.file_name);
          if (fs.existsSync(addFilePath)) {
            attachments.push({
              filename: addItem.original_name,
              path: path.resolve(addFilePath),
              contentType: addItem.file_type,
            });
          }
        }
      }

      await emailService.sendProposalEmail({
        to,
        cc: cc || undefined,
        subject,
        htmlBody: body,
        textBody: body.replace(/<[^>]*>/g, ''),
        attachments,
      });

      // Log the share
      await db.query(
        `INSERT INTO collateral_share_log (collateral_id, shared_by, channel, recipient_info, sent_as_attachment)
         VALUES (?, ?, 'email', ?, ?)`,
        [collateralId, userId, to, attachFile || (additionalCollateralIds && additionalCollateralIds.length > 0) ? true : false]
      );

      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
      next(error);
    }
  }
}
