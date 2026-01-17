import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { generateFileHash, deleteFile, getFilePath } from '../services/fileService';
import logger from '../utils/logger';

export class DocumentController {
  /**
   * Get all documents with filters
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const tenderId = req.query.tenderId as string;
      const categoryId = req.query.categoryId as string;
      const isFavorite = req.query.isFavorite as string;
      const excludeTenderDocuments = req.query.excludeTenderDocuments === 'true';

      const offset = (page - 1) * pageSize;
      let whereClause = '1=1';
      const params: any[] = [];

      // Check if deleted_at column exists before using it
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'documents' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
        
        // Filter out deleted documents by default (only if column exists)
        if (hasDeletedAt) {
          whereClause += ' AND d.deleted_at IS NULL';
        }
      } catch (checkError) {
        // If check fails, assume column doesn't exist and skip the filter
        logger.warn({ message: 'Could not check for deleted_at column in documents, skipping soft delete filter' });
      }

      if (tenderId) {
        whereClause += ' AND tender_id = ?';
        params.push(tenderId);
      } else if (excludeTenderDocuments) {
        // Exclude tender-specific documents (only show general/company documents)
        whereClause += ' AND tender_id IS NULL';
      }

      if (categoryId) {
        whereClause += ' AND category_id = ?';
        params.push(categoryId);
      }

      if (isFavorite === 'true') {
        whereClause += ' AND is_favorite = TRUE';
      }

      // Optimized: Use single query with COUNT(*) OVER() for better performance
      const [documents] = await db.query(
        `SELECT d.*, u.full_name as uploaded_by_name,
                COUNT(*) OVER() as total
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         WHERE ${whereClause}
         ORDER BY d.uploaded_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      
      const total = documents && (documents as any[]).length > 0 
        ? (documents as any[])[0].total 
        : 0;

      res.json({
        success: true,
        data: {
          data: documents,
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
   * Get document by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [documents] = await db.query(
        `SELECT d.*, u.full_name as uploaded_by_name
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         WHERE d.id = ?`,
        [id]
      );

      const documentsArray = documents as any[];
      if (documentsArray.length === 0) {
        throw new CustomError('Document not found', 404);
      }

      res.json({
        success: true,
        data: documentsArray[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Upload document
   */
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new CustomError('No file uploaded', 400);
      }

      const { tenderId, categoryId, expirationDate, name, description } = req.body;

      // Generate file hash
      const fileHash = await generateFileHash(req.file.path);

      // Check if document_name and description columns exist
      let hasDocumentName = false;
      let hasDescription = false;
      try {
        const [columns] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'documents' 
           AND COLUMN_NAME IN ('document_name', 'description')`
        );
        const columnsArray = columns as any[];
        hasDocumentName = columnsArray.some((col: any) => col.COLUMN_NAME === 'document_name');
        hasDescription = columnsArray.some((col: any) => col.COLUMN_NAME === 'description');
      } catch (checkError) {
        // If check fails, assume columns don't exist
      }

      // Insert document record
      let insertQuery: string;
      let insertParams: any[];
      
      if (hasDocumentName && hasDescription) {
        insertQuery = `INSERT INTO documents (
          tender_id, category_id, file_name, original_name, document_name, description, file_path, file_size,
          mime_type, file_hash, expiration_date, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        insertParams = [
          tenderId || null,
          categoryId || null,
          req.file.filename,
          req.file.originalname,
          name || null,
          description || null,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          fileHash,
          expirationDate || null,
          req.user!.userId,
        ];
      } else {
        insertQuery = `INSERT INTO documents (
          tender_id, category_id, file_name, original_name, file_path, file_size,
          mime_type, file_hash, expiration_date, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        insertParams = [
          tenderId || null,
          categoryId || null,
          req.file.filename,
          req.file.originalname,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          fileHash,
          expirationDate || null,
          req.user!.userId,
        ];
      }

      const [result] = await db.query(insertQuery, insertParams);

      const insertResult = result as any;
      const documentId = insertResult.insertId;

      // Log activity if associated with tender
      if (tenderId) {
        await db.query(
          `INSERT INTO tender_activities (tender_id, user_id, activity_type, description)
           VALUES (?, ?, ?, ?)`,
          [tenderId, req.user!.userId, 'Document Added', `Document uploaded: ${req.file.originalname}`]
        );
      }

      logger.info({
        message: 'Document uploaded',
        documentId,
        fileName: req.file.originalname,
        uploadedBy: req.user!.userId,
      });

      const [documents] = await db.query(
        'SELECT * FROM documents WHERE id = ?',
        [documentId]
      );

      res.status(201).json({
        success: true,
        data: (documents as any[])[0],
      });
    } catch (error: any) {
      // Clean up uploaded file if database insert failed
      if (req.file && req.file.path) {
        try {
          await deleteFile(req.file.filename);
        } catch (cleanupError) {
          logger.error({ message: 'Failed to cleanup file after error', error: cleanupError });
        }
      }
      next(error);
    }
  }

  /**
   * Update document metadata (name, description, category, expiration date)
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, categoryId, expirationDate } = req.body;

      // Get existing document
      const [documents] = await db.query(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      );

      const documentsArray = documents as any[];
      if (documentsArray.length === 0) {
        throw new CustomError('Document not found', 404);
      }

      // Check if document_name and description columns exist
      let hasDocumentName = false;
      let hasDescription = false;
      try {
        const [columns] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'documents' 
           AND COLUMN_NAME IN ('document_name', 'description')`
        );
        const columnsArray = columns as any[];
        hasDocumentName = columnsArray.some((col: any) => col.COLUMN_NAME === 'document_name');
        hasDescription = columnsArray.some((col: any) => col.COLUMN_NAME === 'description');
      } catch (checkError) {
        // If check fails, assume columns don't exist
      }

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];

      if (categoryId !== undefined) {
        updates.push('category_id = ?');
        params.push(categoryId || null);
      }

      if (expirationDate !== undefined) {
        updates.push('expiration_date = ?');
        params.push(expirationDate || null);
      }

      if (hasDocumentName && name !== undefined) {
        updates.push('document_name = ?');
        params.push(name || null);
      }

      if (hasDescription && description !== undefined) {
        updates.push('description = ?');
        params.push(description || null);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      params.push(id);

      await db.query(
        `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      logger.info({
        message: 'Document updated',
        documentId: id,
        updatedBy: req.user!.userId,
      });

      // Get updated document
      const [updatedDocuments] = await db.query(
        `SELECT d.*, u.full_name as uploaded_by_name
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         WHERE d.id = ?`,
        [id]
      );

      res.json({
        success: true,
        data: (updatedDocuments as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Download document
   */
  static async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [documents] = await db.query(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      );

      const documentsArray = documents as any[];
      if (documentsArray.length === 0) {
        throw new CustomError('Document not found', 404);
      }

      const document = documentsArray[0];
      const filePath = getFilePath(document.file_name);

      if (!fs.existsSync(filePath)) {
        throw new CustomError('File not found on server', 404);
      }

      res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
      res.setHeader('Content-Type', document.mime_type);
      res.setHeader('Content-Length', document.file_size);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * View document (inline in browser)
   */
  static async view(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [documents] = await db.query(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      );

      const documentsArray = documents as any[];
      if (documentsArray.length === 0) {
        throw new CustomError('Document not found', 404);
      }

      const document = documentsArray[0];
      const filePath = getFilePath(document.file_name);

      if (!fs.existsSync(filePath)) {
        throw new CustomError('File not found on server', 404);
      }

      // Set headers for inline viewing
      res.setHeader('Content-Disposition', `inline; filename="${document.original_name}"`);
      res.setHeader('Content-Type', document.mime_type);
      res.setHeader('Content-Length', document.file_size);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete document
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Get document before deletion
      const [documents] = await db.query(
        'SELECT * FROM documents WHERE id = ?',
        [id]
      );

      const documentsArray = documents as any[];
      if (documentsArray.length === 0) {
        throw new CustomError('Document not found', 404);
      }

      const document = documentsArray[0];

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'documents' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (checkError) {
        // If check fails, assume no soft delete support
      }

      if (hasDeletedAt) {
        // Soft delete
        await db.query(
          `UPDATE documents SET deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
          [req.user!.userId, id]
        );
      } else {
        // Hard delete - delete file and database record
        try {
          await deleteFile(document.file_name);
        } catch (fileError: any) {
          logger.warn({
            message: 'Failed to delete file',
            fileName: document.file_name,
            error: fileError.message,
          });
        }

        await db.query('DELETE FROM documents WHERE id = ?', [id]);
      }

      logger.info({
        message: 'Document deleted',
        documentId: id,
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Document deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Get current favorite status
      const [documents] = await db.query(
        'SELECT is_favorite FROM documents WHERE id = ?',
        [id]
      );

      const documentsArray = documents as any[];
      if (documentsArray.length === 0) {
        throw new CustomError('Document not found', 404);
      }

      const currentStatus = documentsArray[0].is_favorite;
      const newStatus = !currentStatus;

      await db.query(
        'UPDATE documents SET is_favorite = ? WHERE id = ?',
        [newStatus, id]
      );

      logger.info({
        message: 'Document favorite status toggled',
        documentId: id,
        newStatus,
        updatedBy: req.user!.userId,
      });

      const [updatedDocuments] = await db.query(
        `SELECT d.*, u.full_name as uploaded_by_name
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         WHERE d.id = ?`,
        [id]
      );

      res.json({
        success: true,
        data: (updatedDocuments as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get document categories
   */
  static async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const [categories] = await db.query(
        'SELECT * FROM document_categories ORDER BY name ASC'
      );

      res.json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create document category
   */
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, icon } = req.body;

      if (!name || name.trim() === '') {
        throw new CustomError('Category name is required', 400);
      }

      // Check if category name already exists
      const [existing] = await db.query(
        'SELECT id FROM document_categories WHERE name = ?',
        [name.trim()]
      );

      if ((existing as any[]).length > 0) {
        throw new CustomError('Category name already exists', 400);
      }

      const [result] = await db.query(
        `INSERT INTO document_categories (name, description, icon, is_system)
         VALUES (?, ?, ?, ?)`,
        [name.trim(), description || null, icon || null, false]
      );

      const insertResult = result as any;
      const categoryId = insertResult.insertId;

      logger.info({
        message: 'Document category created',
        categoryId,
        name: name.trim(),
        createdBy: req.user!.userId,
      });

      const [categories] = await db.query(
        'SELECT * FROM document_categories WHERE id = ?',
        [categoryId]
      );

      res.status(201).json({
        success: true,
        data: (categories as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update document category
   */
  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, icon } = req.body;

      // Check if category exists
      const [categories] = await db.query(
        'SELECT * FROM document_categories WHERE id = ?',
        [id]
      );

      const categoriesArray = categories as any[];
      if (categoriesArray.length === 0) {
        throw new CustomError('Category not found', 404);
      }

      const category = categoriesArray[0];

      // System categories cannot be modified
      if (category.is_system) {
        throw new CustomError('System categories cannot be modified', 403);
      }

      // Check if new name conflicts with existing category
      if (name && name.trim() !== category.name) {
        const [nameCheck] = await db.query(
          'SELECT id FROM document_categories WHERE name = ? AND id != ?',
          [name.trim(), id]
        );
        const nameCheckArray = nameCheck as any[];
        if (nameCheckArray.length > 0) {
          throw new CustomError('Category name already exists', 400);
        }
      }

      await db.query(
        `UPDATE document_categories 
         SET name = ?, description = ?, icon = ?
         WHERE id = ?`,
        [
          name ? name.trim() : category.name,
          description !== undefined ? description : category.description,
          icon !== undefined ? icon : category.icon,
          id,
        ]
      );

      logger.info({
        message: 'Document category updated',
        categoryId: id,
        updatedBy: req.user!.userId,
      });

      const [updatedCategories] = await db.query(
        'SELECT * FROM document_categories WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        data: (updatedCategories as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete document category
   */
  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if category exists
      const [categories] = await db.query(
        'SELECT * FROM document_categories WHERE id = ?',
        [id]
      );

      const categoriesArray = categories as any[];
      if (categoriesArray.length === 0) {
        throw new CustomError('Category not found', 404);
      }

      const category = categoriesArray[0];

      // System categories cannot be deleted
      if (category.is_system) {
        throw new CustomError('System categories cannot be deleted', 403);
      }

      // Check if category is in use
      const [documents] = await db.query(
        'SELECT COUNT(*) as count FROM documents WHERE category_id = ?',
        [id]
      );

      const documentsArray = documents as any[];
      if (documentsArray.length > 0 && documentsArray[0].count > 0) {
        throw new CustomError('Cannot delete category that is in use by documents', 400);
      }

      await db.query('DELETE FROM document_categories WHERE id = ?', [id]);

      logger.info({
        message: 'Document category deleted',
        categoryId: id,
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Category deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}
