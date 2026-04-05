import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { getFilePath } from '../services/fileService';
import { NotificationService } from '../services/notificationService';
import { AIService } from '../services/aiService';
import { DocumentExtractor } from '../services/documentExtractor';
import { emailService } from '../services/emailService';
import logger from '../utils/logger';

export class LeadController {
  /**
   * Get all leads with filters and pagination
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string | string[];
      const priority = req.query.priority as string | string[];
      const categoryId = req.query.categoryId as string;
      const assignedTo = req.query.assignedTo as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const leadTypeId = req.query.leadTypeId as string; // Accept leadTypeId/leadType

      // Also support leadType query param (legacy/convenience)
      const leadType = req.query.leadType as string;

      const offset = (page - 1) * pageSize;
      const includeDeleted = req.query.includeDeleted === 'true';
      let whereClause = '1=1';
      const params: any[] = [];

      // Check if deleted_at column exists before using it
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;

        // Filter out deleted leads by default (only if column exists)
        // If includeDeleted is true, show only deleted leads
        // If includeDeleted is false, show only non-deleted leads
        if (hasDeletedAt) {
          if (includeDeleted) {
            whereClause += ' AND t.deleted_at IS NOT NULL';
          } else {
            whereClause += ' AND t.deleted_at IS NULL';
          }
        }
      } catch (checkError: any) {
        // If check fails, assume column doesn't exist and skip the filter
        logger.warn({ message: 'Could not check for deleted_at column, skipping soft delete filter', error: checkError.message });
      }

      // Check if lead_type_id column exists and filter if leadTypeId is provided
      const targetLeadTypeId = leadTypeId || (leadType ? (leadType === 'Lead' ? 2 : 1) : null);

      if (targetLeadTypeId) {
        try {
          const [ltColumnCheck] = await db.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
             AND COLUMN_NAME = 'lead_type_id'
             LIMIT 1`
          );
          const hasLeadTypeId = (ltColumnCheck as any[]).length > 0;

          if (hasLeadTypeId) {
            whereClause += ' AND t.lead_type_id = ?';
            params.push(targetLeadTypeId);
          }
        } catch (checkError: any) {
          logger.warn({ message: 'Could not check for lead_type_id column', error: checkError.message });
        }
      }

      if (search) {
        whereClause += ' AND (t.title LIKE ? OR t.lead_number LIKE ? OR t.description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (status) {
        if (Array.isArray(status)) {
          whereClause += ` AND t.status IN (${status.map(() => '?').join(',')})`;
          params.push(...status);
        } else {
          whereClause += ' AND t.status = ?';
          params.push(status);
        }
      }

      if (priority) {
        if (Array.isArray(priority)) {
          whereClause += ` AND t.priority IN (${priority.map(() => '?').join(',')})`;
          params.push(...priority);
        } else {
          whereClause += ' AND t.priority = ?';
          params.push(priority);
        }
      }

      if (categoryId) {
        whereClause += ' AND t.category_id = ?';
        params.push(categoryId);
      }

      if (assignedTo) {
        whereClause += ' AND t.assigned_to = ?';
        params.push(assignedTo);
      }

      if (dateFrom) {
        whereClause += ' AND t.submission_deadline >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND t.submission_deadline <= ?';
        params.push(dateTo);
      }

      // Product line filter from query param (manual filter in UI)
      const productLineId = req.query.productLineId as string;
      const subCategory = req.query.subCategory as string;

      if (productLineId) {
        whereClause += ' AND t.product_line_id = ?';
        params.push(productLineId);
      }

      if (subCategory) {
        whereClause += ' AND t.sub_category = ?';
        params.push(subCategory);
      }

      // Product line visibility filtering based on user's assigned product lines
      // Admin users with no assigned product lines see everything
      // Users with assigned product lines only see leads from those lines (+ leads with NULL product_line_id)
      const userProductLineIds = req.user?.productLineIds || [];
      const isAdmin = req.user?.role === 'Admin';

      if (userProductLineIds.length > 0 && !isAdmin) {
        const placeholders = userProductLineIds.map(() => '?').join(',');
        whereClause += ` AND (t.product_line_id IN (${placeholders}) OR t.product_line_id IS NULL)`;
        params.push(...userProductLineIds);
      }

      // Get total count - use tenders table (will be leads after migration)
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders t WHERE ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get leads with relations
      let query = `SELECT 
          t.*,
          c.id as company_id, c.company_name, c.email as company_email,
          tc.id as category_id, tc.name as category_name, tc.color as category_color,
          u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email,
          creator.id as creator_id, creator.full_name as creator_name, creator.email as creator_email`;

      if (hasDeletedAt) {
        query += `,
          deleter.id as deleter_id, deleter.full_name as deleter_name`;
      } else {
        query += `,
          NULL as deleter_id, NULL as deleter_name`;
      }

      // Use tenders table initially (will be leads after migration)
      // Support both lead_categories and tender_categories during transition
      query += `
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN (SELECT * FROM tender_categories) tc ON t.category_id = tc.id
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users creator ON t.created_by = creator.id`;

      if (hasDeletedAt) {
        query += `
         LEFT JOIN users deleter ON t.deleted_by = deleter.id`;
      }

      query += `
         WHERE ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`;

      const [leads] = await db.query(query, [...params, pageSize, offset]);

      // Get tags for each lead and transform data
      const leadsArray = leads as any[];
      for (const lead of leadsArray) {
        // Get tags - use tender_tags initially (will be lead_tags after migration)
        const [tags] = await db.query(
          `SELECT tt.id, tt.name, tt.color
           FROM tender_tags tt
           INNER JOIN tender_tag_relations ttr ON tt.id = ttr.tag_id
           WHERE ttr.tender_id = ?`,
          [lead.id]
        );
        lead.tags = tags;

        // Transform snake_case to camelCase and add computed fields
        lead.leadNumber = lead.lead_number || lead.tender_number; // Support both during migration
        lead.companyId = lead.company_id;
        lead.categoryId = lead.category_id;
        lead.leadTypeId = lead.lead_type_id;
        lead.salesStageId = lead.sales_stage_id;
        lead.estimatedValue = lead.estimated_value ? parseFloat(lead.estimated_value) : null;
        lead.dealValue = lead.deal_value ? parseFloat(lead.deal_value) : null;
        lead.probability = lead.probability || 0;
        lead.emdAmount = lead.emd_amount ? parseFloat(lead.emd_amount) : null;
        lead.tenderFees = lead.tender_fees ? parseFloat(lead.tender_fees) : null;
        lead.submissionDeadline = lead.submission_deadline;
        lead.dueDate = lead.submission_deadline; // Alias for compatibility
        lead.expectedAwardDate = lead.expected_award_date;
        lead.expectedCloseDate = lead.expected_close_date;
        lead.contractDurationMonths = lead.contract_duration_months;
        lead.assignedTo = lead.assigned_to;
        lead.productLineId = lead.product_line_id || null;
        lead.subCategory = lead.sub_category || null;

        lead.createdBy = lead.creator_name || 'N/A';
        // Note: updated_by column doesn't exist in schema, so use creator as updatedBy
        lead.updatedBy = lead.creator_name || 'N/A';
        lead.client = lead.company_name || 'N/A';
        lead.deletedAt = hasDeletedAt ? lead.deleted_at : undefined;
        lead.deletedBy = hasDeletedAt ? lead.deleted_by : undefined;
        lead.deleterName = hasDeletedAt ? lead.deleter_name : undefined;
        lead.createdAt = lead.created_at;
        lead.updatedAt = lead.updated_at;

        // Format estimated value with currency
        if (lead.estimatedValue) {
          lead.formattedValue = `${lead.currency || 'INR'} ${lead.estimatedValue.toLocaleString()}`;
        }
        if (lead.dealValue) {
          lead.formattedDealValue = `${lead.currency || 'INR'} ${lead.dealValue.toLocaleString()}`;
        }
      }

      res.json({
        success: true,
        data: {
          data: leadsArray,
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
   * Get lead by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (checkError: any) {
        logger.warn({ message: 'Could not check for deleted_at column', error: checkError.message });
      }

      let leadQuery = `SELECT 
          t.*,
          c.id as company_id, c.company_name, c.email as company_email,
          tc.id as category_id, tc.name as category_name, tc.color as category_color,
          u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email,
          creator.id as creator_id, creator.full_name as creator_name, creator.email as creator_email`;

      if (hasDeletedAt) {
        leadQuery += `,
          deleter.id as deleter_id, deleter.full_name as deleter_name`;
      } else {
        leadQuery += `,
          NULL as deleter_id, NULL as deleter_name`;
      }

      // Use tenders table initially (will be leads after migration)
      leadQuery += `
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN tender_categories tc ON t.category_id = tc.id
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users creator ON t.created_by = creator.id`;

      if (hasDeletedAt) {
        leadQuery += `
         LEFT JOIN users deleter ON t.deleted_by = deleter.id`;
      }

      leadQuery += `
         WHERE t.id = ?`;

      const [leads] = await db.query(leadQuery, [id]);

      const leadArray = leads as any[];
      if (leadArray.length === 0) {
        throw new CustomError('Lead not found', 404);
      }

      const lead = leadArray[0];

      // Get tags - use tender_tags initially
      const [tags] = await db.query(
        `SELECT tt.id, tt.name, tt.color
         FROM tender_tags tt
         INNER JOIN tender_tag_relations ttr ON tt.id = ttr.tag_id
         WHERE ttr.tender_id = ?`,
        [id]
      );
      lead.tags = tags;

      // Transform snake_case to camelCase and add computed fields
      lead.leadNumber = lead.lead_number || lead.tender_number; // Support both during migration
      lead.companyId = lead.company_id;
      lead.categoryId = lead.category_id;
      lead.leadTypeId = lead.lead_type_id;
      lead.salesStageId = lead.sales_stage_id;
      lead.estimatedValue = lead.estimated_value ? parseFloat(lead.estimated_value) : null;
      lead.dealValue = lead.deal_value ? parseFloat(lead.deal_value) : null;
      lead.probability = lead.probability || 0;
      lead.emdAmount = lead.emd_amount ? parseFloat(lead.emd_amount) : null;
      lead.tenderFees = lead.tender_fees ? parseFloat(lead.tender_fees) : null;
      lead.submissionDeadline = lead.submission_deadline;
      lead.dueDate = lead.submission_deadline; // Alias for compatibility
      lead.expectedAwardDate = lead.expected_award_date;
      lead.expectedCloseDate = lead.expected_close_date;
      lead.contractDurationMonths = lead.contract_duration_months;
      lead.assignedTo = lead.assigned_to;

      lead.createdBy = lead.creator_name || 'N/A';
      // Note: updated_by column doesn't exist in schema, so use creator as updatedBy
      lead.updatedBy = lead.creator_name || 'N/A';
      lead.client = lead.company_name || 'N/A';
      lead.deletedAt = hasDeletedAt ? lead.deleted_at : undefined;
      lead.deletedBy = hasDeletedAt ? lead.deleted_by : undefined;
      lead.deleterName = hasDeletedAt ? lead.deleter_name : undefined;
      lead.createdAt = lead.created_at;
      lead.updatedAt = lead.updated_at;

      // Include AI summary if column exists
      try {
        const [aiSummaryCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'ai_summary'
           LIMIT 1`
        );
        const hasAiSummaryColumn = (aiSummaryCheck as any[]).length > 0;
        if (hasAiSummaryColumn) {
          lead.aiSummary = lead.ai_summary || null;
          lead.aiSummaryGeneratedAt = lead.ai_summary_generated_at || null;
          lead.aiSummaryGeneratedBy = lead.ai_summary_generated_by || null;
        }
      } catch (checkError: any) {
        // Column doesn't exist, skip
      }

      // Format estimated value with currency
      if (lead.estimatedValue) {
        lead.formattedValue = `${lead.currency || 'INR'} ${lead.estimatedValue.toLocaleString()}`;
      }
      if (lead.dealValue) {
        lead.formattedDealValue = `${lead.currency || 'INR'} ${lead.dealValue.toLocaleString()}`;
      }

      res.json({
        success: true,
        data: lead,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create lead
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        leadNumber,
        title,
        description,
        companyId,
        categoryId,
        status,
        priority,
        estimatedValue,
        currency,
        emdAmount,
        tenderFees,
        submissionDeadline,
        expectedAwardDate,
        contractDurationMonths,
        assignedTo,
        tagIds,
      } = req.body;

      if (!title) {
        throw new CustomError('Title is required', 400);
      }

      // Auto-generate lead number if not provided (format: LD-00001)
      let finalLeadNumber = leadNumber && leadNumber.trim() ? leadNumber.trim() : null;
      if (!finalLeadNumber) {
        const [maxRow] = await db.query(
          "SELECT tender_number FROM tenders WHERE tender_number LIKE 'LD-%' ORDER BY CAST(SUBSTRING(tender_number, 4) AS UNSIGNED) DESC LIMIT 1"
        );
        const lastNum = (maxRow as any[])?.[0]?.tender_number;
        const nextSeq = lastNum ? parseInt(lastNum.replace('LD-', ''), 10) + 1 : 1;
        finalLeadNumber = `LD-${String(nextSeq).padStart(5, '0')}`;
      }

      // Check if lead number already exists
      const [existing] = await db.query(
        'SELECT id FROM tenders WHERE tender_number = ? OR lead_number = ?',
        [finalLeadNumber, finalLeadNumber]
      );

      if ((existing as any[]).length > 0) {
        throw new CustomError('Lead number already exists', 409);
      }

      // Insert lead - use tenders table initially (will be leads after migration)
      // Check which columns exist before inserting to support gradual migration
      const [columns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenders'`
      );
      const columnNames = (columns as any[]).map(c => c.COLUMN_NAME);

      const hasLeadTypeId = columnNames.includes('lead_type_id');
      const hasSalesStageId = columnNames.includes('sales_stage_id');
      const hasDealValue = columnNames.includes('deal_value');
      const hasProbability = columnNames.includes('probability');
      const hasExpectedCloseDate = columnNames.includes('expected_close_date');
      const hasSource = columnNames.includes('source');

      let insertFields = `tender_number, title, description, company_id, category_id, status, priority,
          estimated_value, currency, emd_amount, tender_fees, submission_deadline, expected_award_date,
          contract_duration_months, assigned_to, created_by`;
      let insertValues = `?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?`;
      const insertParams: any[] = [
        finalLeadNumber,
        title,
        description || null,
        companyId || null,
        categoryId || null,
        status || 'Draft',
        priority || 'Medium',
        estimatedValue || null,
        currency || 'INR',
        emdAmount || 0,
        tenderFees || 0,
        submissionDeadline || null,
        expectedAwardDate || null,
        contractDurationMonths || null,
        assignedTo || null,
        req.user!.userId,
      ];

      // Add new CRM fields if columns exist
      if (hasLeadTypeId) {
        insertFields += ', lead_type_id';
        insertValues += ', ?';
        insertParams.push(req.body.leadTypeId || null);
      }
      if (hasSalesStageId) {
        insertFields += ', sales_stage_id';
        insertValues += ', ?';
        insertParams.push(req.body.salesStageId || null);
      }
      if (hasDealValue) {
        insertFields += ', deal_value';
        insertValues += ', ?';
        insertParams.push(req.body.dealValue || null);
      }
      if (hasProbability) {
        insertFields += ', probability';
        insertValues += ', ?';
        insertParams.push(req.body.probability || null);
      }
      if (hasExpectedCloseDate) {
        insertFields += ', expected_close_date';
        insertValues += ', ?';
        insertParams.push(req.body.expectedCloseDate || null);
      }
      if (hasSource) {
        insertFields += ', source';
        insertValues += ', ?';
        insertParams.push(req.body.source || null);
      }

      // Add product line fields if columns exist
      const hasProductLineId = columnNames.includes('product_line_id');
      const hasSubCategory = columnNames.includes('sub_category');

      if (hasProductLineId) {
        insertFields += ', product_line_id';
        insertValues += ', ?';
        insertParams.push(req.body.productLineId || null);
      }
      if (hasSubCategory) {
        insertFields += ', sub_category';
        insertValues += ', ?';
        insertParams.push(req.body.subCategory || null);
      }

      const [result] = await db.query(
        `INSERT INTO tenders (${insertFields}) VALUES (${insertValues})`,
        insertParams
      );

      const insertResult = result as any;
      const leadId = insertResult.insertId;

      // Add tags if provided - use tender_tag_relations initially
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        for (const tagId of tagIds) {
          await db.query(
            'INSERT INTO tender_tag_relations (tender_id, tag_id) VALUES (?, ?)',
            [leadId, tagId]
          );
        }
      }

      // Log creation activity with details
      const creationDetails = [
        title ? `Title: ${title}` : '',
        leadNumber ? `Lead Number: ${leadNumber}` : '',
        status ? `Status: ${status}` : '',
        priority ? `Priority: ${priority}` : '',
        estimatedValue ? `Estimated Value: ${currency || 'INR'} ${estimatedValue.toLocaleString()}` : '',
        emdAmount ? `EMD: ${currency || 'INR'} ${emdAmount.toLocaleString()}` : '',
        tenderFees ? `Tender Fees: ${currency || 'INR'} ${tenderFees.toLocaleString()}` : '',
        submissionDeadline ? `Deadline: ${new Date(submissionDeadline).toLocaleString()}` : '',
      ].filter(Boolean).join(', ');

      await db.query(
        `INSERT INTO tender_activities (tender_id, user_id, activity_type, description, old_value, new_value)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          insertResult.insertId,
          req.user!.userId,
          'Created',
          `Lead created: ${creationDetails}`,
          'N/A',
          creationDetails || 'New Lead'
        ]
      );

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'CREATE_LEAD',
          'Lead',
          leadId,
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ leadNumber, title }),
        ]
      );

      logger.info({
        message: 'Lead created',
        leadId,
        createdBy: req.user!.userId,
      });

      // Get created lead with relations - use tenders table initially
      const [leads] = await db.query(
        `SELECT 
          t.*,
          c.id as company_id, c.company_name, c.email as company_email,
          tc.id as category_id, tc.name as category_name, tc.color as category_color,
          u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email,
          creator.id as creator_id, creator.full_name as creator_name, creator.email as creator_email
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN tender_categories tc ON t.category_id = tc.id
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users creator ON t.created_by = creator.id
         WHERE t.id = ?`,
        [leadId]
      );

      const lead = (leads as any[])[0];
      if (lead) {
        // Transform data
        lead.leadNumber = lead.lead_number || lead.tender_number; // Support both during migration
        lead.companyId = lead.company_id;
        lead.categoryId = lead.category_id;
        lead.leadTypeId = lead.lead_type_id;
        lead.salesStageId = lead.sales_stage_id;
        lead.estimatedValue = lead.estimated_value ? parseFloat(lead.estimated_value) : null;
        lead.dealValue = lead.deal_value ? parseFloat(lead.deal_value) : null;
        lead.probability = lead.probability || 0;
        lead.emdAmount = lead.emd_amount ? parseFloat(lead.emd_amount) : null;
        lead.tenderFees = lead.tender_fees ? parseFloat(lead.tender_fees) : null;
        lead.submissionDeadline = lead.submission_deadline;
        lead.dueDate = lead.submission_deadline;
        lead.expectedAwardDate = lead.expected_award_date;
        lead.expectedCloseDate = lead.expected_close_date;
        lead.contractDurationMonths = lead.contract_duration_months;
        lead.assignedTo = lead.assigned_to;

        lead.createdBy = lead.creator_name || 'N/A';
        lead.updatedBy = lead.creator_name || 'N/A'; // Use creator as updated_by since updated_by column doesn't exist
        lead.client = lead.company_name || 'N/A';
        lead.createdAt = lead.created_at;
        lead.updatedAt = lead.updated_at;

        if (lead.estimatedValue) {
          lead.formattedValue = `${lead.currency || 'INR'} ${lead.estimatedValue.toLocaleString()}`;
        }
        if (lead.dealValue) {
          lead.formattedDealValue = `${lead.currency || 'INR'} ${lead.dealValue.toLocaleString()}`;
        }
      }

      // Send notifications if enabled
      let notificationResult = { emailSent: false, desktopNotification: false };
      try {
        notificationResult = await NotificationService.sendLeadCreatedNotification(
          lead,
          lead.createdBy || 'System'
        );
      } catch (notifError: any) {
        // Log but don't fail the request
        logger.error({
          message: 'Failed to send lead created notification',
          leadId,
          error: notifError.message,
        });
      }

      res.status(201).json({
        success: true,
        data: lead,
        notification: notificationResult,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update lead
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Get existing lead - use tenders table initially
      const [existing] = await db.query(
        'SELECT * FROM tenders WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('Lead not found', 404);
      }

      const oldLead = existingArray[0];
      const changes: any = {};

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];

      // Map camelCase frontend fields to snake_case database fields
      const fieldMap: Record<string, string> = {
        title: 'title',
        description: 'description',
        companyId: 'company_id',
        categoryId: 'category_id',
        leadTypeId: 'lead_type_id',
        salesStageId: 'sales_stage_id',
        status: 'status',
        priority: 'priority',
        estimatedValue: 'estimated_value',
        dealValue: 'deal_value',
        probability: 'probability',
        currency: 'currency',
        emdAmount: 'emd_amount',
        tenderFees: 'tender_fees',
        submissionDeadline: 'submission_deadline',
        expectedAwardDate: 'expected_award_date',
        expectedCloseDate: 'expected_close_date',
        contractDurationMonths: 'contract_duration_months',
        assignedTo: 'assigned_to',
        source: 'source',
        productLineId: 'product_line_id',
        subCategory: 'sub_category',
      };

      // Track all field changes for activity logging
      const fieldChanges: Array<{ field: string, old: any, new: any, activityType: string }> = [];

      for (const [frontendField, dbField] of Object.entries(fieldMap)) {
        const value = updateData[frontendField];
        const oldValue = oldLead[dbField];

        if (value !== undefined && value !== oldValue) {
          updates.push(`${dbField} = ?`);
          params.push(value || null);
          changes[frontendField] = { old: oldValue, new: value };

          // Determine activity type and format values for logging
          let activityType = 'Updated';
          let formattedOldValue = oldValue !== null && oldValue !== undefined ? String(oldValue) : 'N/A';
          let formattedNewValue = value !== null && value !== undefined ? String(value) : 'N/A';

          // Special handling for specific fields
          if (frontendField === 'status') {
            activityType = 'Status Changed';
          } else if (frontendField === 'priority') {
            activityType = 'Updated';
            formattedOldValue = oldValue || 'Not Set';
            formattedNewValue = value || 'Not Set';
          } else if (frontendField === 'submissionDeadline') {
            activityType = 'Deadline Changed';
            formattedOldValue = oldValue ? new Date(oldValue).toLocaleString() : 'Not Set';
            formattedNewValue = value ? new Date(value).toLocaleString() : 'Not Set';
          } else if (frontendField === 'estimatedValue' || frontendField === 'emdAmount' || frontendField === 'tenderFees') {
            activityType = 'Updated';
            const currency = updateData.currency || oldLead.currency || 'INR';
            formattedOldValue = oldValue !== null && oldValue !== undefined ? `${currency} ${parseFloat(oldValue).toLocaleString()}` : 'Not Set';
            formattedNewValue = value !== null && value !== undefined ? `${currency} ${parseFloat(value).toLocaleString()}` : 'Not Set';
          } else if (frontendField === 'assignedTo') {
            activityType = 'Assigned';
            // Will be handled separately with user lookup
          } else if (frontendField === 'companyId') {
            activityType = 'Updated';
            // Will be handled separately with company lookup
          }

          fieldChanges.push({
            field: frontendField,
            old: formattedOldValue,
            new: formattedNewValue,
            activityType
          });
        }
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await db.query(
        `UPDATE tenders SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Update tags if provided
      if (updateData.tagIds !== undefined) {
        // Get old tags
        const [oldTags] = await db.query(
          `SELECT tt.id, tt.name FROM tender_tags tt
           INNER JOIN tender_tag_relations ttr ON tt.id = ttr.tag_id
           WHERE ttr.tender_id = ?`,
          [id]
        );
        const oldTagNames = (oldTags as any[]).map(t => t.name).join(', ') || 'None';

        // Delete existing tags
        await db.query('DELETE FROM tender_tag_relations WHERE tender_id = ?', [id]);

        // Add new tags
        let newTagNames = 'None';
        if (Array.isArray(updateData.tagIds) && updateData.tagIds.length > 0) {
          const [newTags] = await db.query(
            `SELECT name FROM tender_tags WHERE id IN (${updateData.tagIds.map(() => '?').join(',')})`,
            updateData.tagIds
          );
          newTagNames = (newTags as any[]).map(t => t.name).join(', ');

          for (const tagId of updateData.tagIds) {
            await db.query(
              'INSERT INTO tender_tag_relations (tender_id, tag_id) VALUES (?, ?)',
              [id, tagId]
            );
          }
        }

        // Log tag change
        if (oldTagNames !== newTagNames) {
          await db.query(
            `INSERT INTO tender_activities (tender_id, user_id, activity_type, old_value, new_value, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              parseInt(id),
              req.user!.userId,
              'Updated',
              oldTagNames,
              newTagNames,
              `Tags changed from "${oldTagNames}" to "${newTagNames}"`
            ]
          );
        }
      }

      // Log all field changes as activities
      for (const change of fieldChanges) {
        // Handle special cases with lookups
        let oldVal = change.old;
        let newVal = change.new;
        let description = `${change.field} changed from "${oldVal}" to "${newVal}"`;

        if (change.field === 'assignedTo') {
          // Lookup user names
          if (oldLead.assigned_to) {
            const [oldUser] = await db.query('SELECT full_name FROM users WHERE id = ?', [oldLead.assigned_to]);
            oldVal = (oldUser as any[])[0]?.full_name || 'Unassigned';
          } else {
            oldVal = 'Unassigned';
          }
          if (updateData.assignedTo) {
            const [newUser] = await db.query('SELECT full_name FROM users WHERE id = ?', [updateData.assignedTo]);
            newVal = (newUser as any[])[0]?.full_name || 'Unassigned';
          } else {
            newVal = 'Unassigned';
          }
          description = `Assigned to changed from "${oldVal}" to "${newVal}"`;
        } else if (change.field === 'companyId') {
          // Lookup company names
          if (oldLead.company_id) {
            const [oldCompany] = await db.query('SELECT company_name FROM companies WHERE id = ?', [oldLead.company_id]);
            oldVal = (oldCompany as any[])[0]?.company_name || 'None';
          } else {
            oldVal = 'None';
          }
          if (updateData.companyId) {
            const [newCompany] = await db.query('SELECT company_name FROM companies WHERE id = ?', [updateData.companyId]);
            newVal = (newCompany as any[])[0]?.company_name || 'None';
          } else {
            newVal = 'None';
          }
          description = `Company changed from "${oldVal}" to "${newVal}"`;
        }

        await db.query(
          `INSERT INTO tender_activities (tender_id, user_id, activity_type, old_value, new_value, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            parseInt(id),
            req.user!.userId,
            change.activityType,
            oldVal,
            newVal,
            description
          ]
        );
      }

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'UPDATE_LEAD',
          'Lead',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify(changes),
        ]
      );

      logger.info({
        message: 'Lead updated',
        leadId: id,
        updatedBy: req.user!.userId,
      });

      // Get updated lead with relations - use tenders table initially
      const [leads] = await db.query(
        `SELECT 
          t.*,
          c.id as company_id, c.company_name, c.email as company_email,
          tc.id as category_id, tc.name as category_name, tc.color as category_color,
          u.id as assigned_user_id, u.full_name as assigned_user_name, u.email as assigned_user_email,
          creator.id as creator_id, creator.full_name as creator_name, creator.email as creator_email
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN tender_categories tc ON t.category_id = tc.id
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users creator ON t.created_by = creator.id
         WHERE t.id = ?`,
        [id]
      );

      const lead = (leads as any[])[0];
      if (lead) {
        // Transform data
        lead.leadNumber = lead.lead_number || lead.tender_number; // Support both during migration
        lead.companyId = lead.company_id;
        lead.categoryId = lead.category_id;
        lead.leadTypeId = lead.lead_type_id;
        lead.salesStageId = lead.sales_stage_id;
        lead.estimatedValue = lead.estimated_value ? parseFloat(lead.estimated_value) : null;
        lead.dealValue = lead.deal_value ? parseFloat(lead.deal_value) : null;
        lead.probability = lead.probability || 0;
        lead.emdAmount = lead.emd_amount ? parseFloat(lead.emd_amount) : null;
        lead.tenderFees = lead.tender_fees ? parseFloat(lead.tender_fees) : null;
        lead.submissionDeadline = lead.submission_deadline;
        lead.dueDate = lead.submission_deadline;
        lead.expectedAwardDate = lead.expected_award_date;
        lead.expectedCloseDate = lead.expected_close_date;
        lead.contractDurationMonths = lead.contract_duration_months;
        lead.assignedTo = lead.assigned_to;

        lead.createdBy = lead.creator_name || 'N/A';
        lead.updatedBy = lead.creator_name || 'N/A'; // Use creator as updated_by since updated_by column doesn't exist
        lead.client = lead.company_name || 'N/A';
        lead.createdAt = lead.created_at;
        lead.updatedAt = lead.updated_at;

        if (lead.estimatedValue) {
          lead.formattedValue = `${lead.currency || 'INR'} ${lead.estimatedValue.toLocaleString()}`;
        }
        if (lead.dealValue) {
          lead.formattedDealValue = `${lead.currency || 'INR'} ${lead.dealValue.toLocaleString()}`;
        }
      }

      // Send notifications if enabled
      let notificationResult = { emailSent: false, desktopNotification: false };
      try {
        // Get user who updated
        const [updater] = await db.query(
          'SELECT full_name FROM users WHERE id = ?',
          [req.user!.userId]
        );
        const updaterName = (updater as any[])[0]?.full_name || 'Unknown User';

        notificationResult = await NotificationService.sendLeadUpdateNotification(
          lead,
          changes,
          updaterName
        );
      } catch (notifError: any) {
        // Log but don't fail the request
        logger.error({
          message: 'Failed to send lead update notification',
          leadId: id,
          error: notifError.message,
        });
      }

      res.json({
        success: true,
        data: lead,
        notification: notificationResult,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Soft delete tender and associated documents/activities
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (checkError) {
        // Column doesn't exist, will use hard delete
      }

      // Get tender before deletion
      let query = 'SELECT * FROM tenders WHERE id = ?';
      if (hasDeletedAt) {
        query += ' AND deleted_at IS NULL';
      }
      const [tenders] = await db.query(query, [id]);

      const tenderArray = tenders as any[];
      if (tenderArray.length === 0) {
        throw new CustomError('Tender not found or already deleted', 404);
      }

      if (hasDeletedAt) {
        // Soft delete tender
        await db.query(
          'UPDATE tenders SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
          [req.user!.userId, id]
        );

        // Soft delete associated documents (if column exists)
        try {
          const [docColumnCheck] = await db.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'documents' 
             AND COLUMN_NAME = 'deleted_at'`
          );
          if ((docColumnCheck as any[]).length > 0) {
            await db.query(
              'UPDATE documents SET deleted_at = NOW(), deleted_by = ? WHERE tender_id = ? AND deleted_at IS NULL',
              [req.user!.userId, id]
            );
          }
        } catch (docError) {
          logger.warn({ message: 'Could not soft delete documents', error: docError });
        }

        // Soft delete associated activities (if column exists)
        try {
          const [actColumnCheck] = await db.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'tender_activities' 
             AND COLUMN_NAME = 'deleted_at'`
          );
          if ((actColumnCheck as any[]).length > 0) {
            await db.query(
              'UPDATE tender_activities SET deleted_at = NOW() WHERE tender_id = ? AND deleted_at IS NULL',
              [id]
            );
          }
        } catch (actError) {
          logger.warn({ message: 'Could not soft delete activities', error: actError });
        }
      } else {
        // Hard delete if soft delete columns don't exist
        // Delete associated documents first
        await db.query('DELETE FROM documents WHERE tender_id = ?', [id]);

        // Delete associated activities
        await db.query('DELETE FROM tender_activities WHERE tender_id = ?', [id]);

        // Delete tag relations
        await db.query('DELETE FROM tender_tag_relations WHERE tender_id = ?', [id]);

        // Delete tender
        await db.query('DELETE FROM tenders WHERE id = ?', [id]);
      }

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'SOFT_DELETE_TENDER',
          'Tender',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ deletedTender: tenderArray[0].tender_number }),
        ]
      );

      logger.info({
        message: 'Tender soft deleted',
        tenderId: id,
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Tender deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Restore soft-deleted tender and associated documents/activities
   */
  static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (checkError) {
        throw new CustomError('Soft delete is not enabled. Please run database migration first.', 400);
      }

      if (!hasDeletedAt) {
        throw new CustomError('Soft delete is not enabled. Please run database migration first.', 400);
      }

      // Check if tender exists and is deleted
      const [tenders] = await db.query(
        'SELECT * FROM tenders WHERE id = ? AND deleted_at IS NOT NULL',
        [id]
      );

      const tenderArray = tenders as any[];
      if (tenderArray.length === 0) {
        throw new CustomError('Tender not found or not deleted', 404);
      }

      // Restore tender
      await db.query(
        'UPDATE tenders SET deleted_at = NULL, deleted_by = NULL WHERE id = ?',
        [id]
      );

      // Restore associated documents (if column exists)
      try {
        const [docColumnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'documents' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((docColumnCheck as any[]).length > 0) {
          await db.query(
            'UPDATE documents SET deleted_at = NULL, deleted_by = NULL WHERE tender_id = ? AND deleted_at IS NOT NULL',
            [id]
          );
        }
      } catch (docError) {
        logger.warn({ message: 'Could not restore documents', error: docError });
      }

      // Restore associated activities (if column exists)
      try {
        const [actColumnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tender_activities' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((actColumnCheck as any[]).length > 0) {
          await db.query(
            'UPDATE tender_activities SET deleted_at = NULL WHERE tender_id = ? AND deleted_at IS NOT NULL',
            [id]
          );
        }
      } catch (actError) {
        logger.warn({ message: 'Could not restore activities', error: actError });
      }

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'RESTORE_TENDER',
          'Tender',
          parseInt(id),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({ restoredTender: tenderArray[0].tender_number }),
        ]
      );

      logger.info({
        message: 'Tender restored',
        tenderId: id,
        restoredBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Tender restored successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get tender activities
   */
  static async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if deleted_at column exists in tender_activities
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tender_activities' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (checkError) {
        logger.warn({ message: 'Could not check for deleted_at column in tender_activities' });
      }

      let activitiesQuery = `SELECT 
          ta.*,
          u.id as user_id, u.full_name as user_name, u.email as user_email
         FROM tender_activities ta
         LEFT JOIN users u ON ta.user_id = u.id
         WHERE ta.tender_id = ?`;

      if (hasDeletedAt) {
        activitiesQuery += ' AND ta.deleted_at IS NULL';
      }

      activitiesQuery += ' ORDER BY ta.created_at DESC';

      const [activities] = await db.query(activitiesQuery, [id]);

      res.json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Add tender activity
   */
  static async addActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { activityType, description, oldValue, newValue } = req.body;

      if (!activityType || !description) {
        throw new CustomError('Activity type and description are required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO tender_activities (tender_id, user_id, activity_type, description, old_value, new_value)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          parseInt(id),
          req.user!.userId,
          activityType,
          description,
          oldValue || null,
          newValue || null,
        ]
      );

      const insertResult = result as any;

      // Get the created activity with user info
      const [activities] = await db.query(
        `SELECT 
          ta.*,
          u.id as user_id, u.full_name as user_name, u.email as user_email
         FROM tender_activities ta
         LEFT JOIN users u ON ta.user_id = u.id
         WHERE ta.id = ?`,
        [insertResult.insertId]
      );

      const activityArray = activities as any[];
      const activity = activityArray[0];

      // Get tender information for notification
      const [tenders] = await db.query(
        `SELECT 
          t.*,
          c.company_name,
          creator.full_name as creator_name
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN users creator ON t.created_by = creator.id
         WHERE t.id = ?`,
        [parseInt(id)]
      );

      const tenderArray = tenders as any[];
      const tender = tenderArray[0];

      // Transform tender data
      let transformedTender: any = null;
      if (tender) {
        transformedTender = {
          id: tender.id,
          tenderNumber: tender.tender_number,
          title: tender.title,
          client: tender.company_name || 'N/A',
          status: tender.status,
        };
      }

      // Send notifications if enabled (only for worklog entries, i.e., 'Commented' type)
      let notificationResult = { emailSent: false, desktopNotification: false };
      if (activityType === 'Commented' && transformedTender) {
        try {
          // Get user who created the worklog
          const [users] = await db.query(
            'SELECT full_name FROM users WHERE id = ?',
            [req.user!.userId]
          );
          const creatorName = (users as any[])[0]?.full_name || 'Unknown User';

          notificationResult = await NotificationService.sendWorkLogCreatedNotification(
            transformedTender,
            {
              id: activity.id,
              description: activity.description,
              activityType: activity.activity_type,
              createdAt: activity.created_at,
            },
            creatorName
          );
        } catch (notifError: any) {
          // Log but don't fail the request
          logger.error({
            message: 'Failed to send work log created notification',
            tenderId: parseInt(id),
            activityId: activity.id,
            error: notifError.message,
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          id: activity.id,
          tenderId: activity.tender_id,
          userId: activity.user_id,
          user: activity.user_name ? {
            id: activity.user_id,
            fullName: activity.user_name,
            email: activity.user_email,
          } : undefined,
          activityType: activity.activity_type,
          description: activity.description,
          oldValue: activity.old_value,
          newValue: activity.new_value,
          createdAt: activity.created_at,
        },
        notification: notificationResult,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete a work log entry (activity) - Only allow deletion of 'Commented' type activities
   */
  static async deleteActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, activityId } = req.params;

      // Verify the activity exists and belongs to the tender
      const [activities] = await db.query(
        `SELECT * FROM tender_activities WHERE id = ? AND tender_id = ?`,
        [parseInt(activityId), parseInt(id)]
      );

      const activityArray = activities as any[];
      if (activityArray.length === 0) {
        throw new CustomError('Activity not found', 404);
      }

      const activity = activityArray[0];

      // Only allow deletion of 'Commented' type activities (work logs)
      // Audit logs (system-generated) should not be deletable
      if (activity.activity_type !== 'Commented') {
        throw new CustomError('Only work log entries (Commented activities) can be deleted. Audit logs are permanent.', 400);
      }

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tender_activities' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (checkError) {
        // If check fails, assume no soft delete support
      }

      if (hasDeletedAt) {
        // Soft delete
        await db.query(
          `UPDATE tender_activities SET deleted_at = NOW() WHERE id = ?`,
          [parseInt(activityId)]
        );
      } else {
        // Hard delete
        await db.query(
          `DELETE FROM tender_activities WHERE id = ?`,
          [parseInt(activityId)]
        );
      }

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'DELETE_WORK_LOG',
          'TenderActivity',
          parseInt(activityId),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({
            tenderId: parseInt(id),
            activityType: activity.activity_type,
            description: activity.description?.substring(0, 100), // Truncate for logging
          }),
        ]
      );

      logger.info({
        message: 'Work log entry deleted',
        activityId: parseInt(activityId),
        tenderId: parseInt(id),
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Work log entry deleted successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a work log entry (activity) - Only allow updating 'Commented' type activities
   */
  static async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, activityId } = req.params;
      const { description } = req.body;

      if (!description || !description.trim()) {
        throw new CustomError('Description is required', 400);
      }

      // Verify the activity exists and belongs to the tender
      const [activities] = await db.query(
        `SELECT * FROM tender_activities WHERE id = ? AND tender_id = ?`,
        [parseInt(activityId), parseInt(id)]
      );

      const activityArray = activities as any[];
      if (activityArray.length === 0) {
        throw new CustomError('Activity not found', 404);
      }

      const activity = activityArray[0];

      // Only allow updating 'Commented' type activities (work logs)
      // Audit logs (system-generated) should not be editable
      if (activity.activity_type !== 'Commented') {
        throw new CustomError('Only work log entries (Commented activities) can be updated. Audit logs are permanent.', 400);
      }

      // Check if updated_at column exists
      let hasUpdatedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tender_activities' 
           AND COLUMN_NAME = 'updated_at'`
        );
        hasUpdatedAt = (columnCheck as any[]).length > 0;
      } catch (checkError) {
        // If check fails, assume no updated_at column
      }

      // Update the activity
      if (hasUpdatedAt) {
        await db.query(
          `UPDATE tender_activities SET description = ?, updated_at = NOW() WHERE id = ?`,
          [description.trim(), parseInt(activityId)]
        );
      } else {
        await db.query(
          `UPDATE tender_activities SET description = ? WHERE id = ?`,
          [description.trim(), parseInt(activityId)]
        );
      }

      // Get updated activity with user info
      const [updatedActivities] = await db.query(
        `SELECT 
          ta.*,
          u.id as user_id, u.full_name as user_name, u.email as user_email
         FROM tender_activities ta
         LEFT JOIN users u ON ta.user_id = u.id
         WHERE ta.id = ?`,
        [parseInt(activityId)]
      );

      const updatedActivityArray = updatedActivities as any[];
      const updatedActivity = updatedActivityArray[0];

      // Log audit
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user!.userId,
          'UPDATE_WORK_LOG',
          'TenderActivity',
          parseInt(activityId),
          req.ip,
          req.get('user-agent') || '',
          JSON.stringify({
            tenderId: parseInt(id),
            activityType: activity.activity_type,
            oldDescription: activity.description?.substring(0, 100),
            newDescription: description.trim().substring(0, 100),
          }),
        ]
      );

      logger.info({
        message: 'Work log entry updated',
        activityId: parseInt(activityId),
        tenderId: parseInt(id),
        updatedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          id: updatedActivity.id,
          tenderId: updatedActivity.tender_id,
          userId: updatedActivity.user_id,
          user: updatedActivity.user_name ? {
            id: updatedActivity.user_id,
            fullName: updatedActivity.user_name,
            email: updatedActivity.user_email,
          } : undefined,
          activityType: updatedActivity.activity_type,
          description: updatedActivity.description,
          oldValue: updatedActivity.old_value,
          newValue: updatedActivity.new_value,
          createdAt: updatedActivity.created_at,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Permanently delete tender and all associated data
   * This removes everything related to the tender from the entire system
   */
  static async permanentDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Parse and validate ID
      const tenderId = parseInt(id, 10);
      if (isNaN(tenderId) || tenderId <= 0) {
        throw new CustomError('Invalid tender ID', 400);
      }

      // Get tender before deletion for logging - verify it exists and is deleted
      // Use explicit parameter binding to prevent SQL injection
      const [tenders] = await db.query('SELECT * FROM tenders WHERE id = ?', [tenderId]);
      const tenderArray = tenders as any[];

      if (tenderArray.length === 0) {
        throw new CustomError(`Tender with ID ${tenderId} not found`, 404);
      }

      if (tenderArray.length > 1) {
        logger.error({
          message: 'Multiple tenders found with same ID - database integrity issue',
          tenderId,
          count: tenderArray.length,
        });
        throw new CustomError('Database integrity error: Multiple tenders with same ID found', 500);
      }

      const tender = tenderArray[0];

      // Log the tender we're about to delete for debugging
      logger.info({
        message: 'Permanent delete request received',
        tenderId,
        tenderNumber: tender.tender_number,
        tenderTitle: tender.title,
        isDeleted: !!tender.deleted_at,
        requestedBy: req.user!.userId,
      });

      // Verify the tender is actually deleted (safety check)
      // Check if deleted_at column exists
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        if ((columnCheck as any[]).length > 0) {
          // If deleted_at column exists, verify tender is deleted
          if (!tender.deleted_at) {
            // Tender is not deleted - this is a safety check
            logger.warn({
              message: 'Attempt to permanently delete non-deleted tender',
              tenderId,
              tenderNumber: tender.tender_number,
              userId: req.user!.userId,
            });
            throw new CustomError('Cannot permanently delete an active tender. Please soft delete it first.', 400);
          }
        }
        // If deleted_at column doesn't exist, allow deletion (backward compatibility)
      } catch (checkError: any) {
        if (checkError instanceof CustomError) {
          throw checkError;
        }
        // If check fails, allow deletion (backward compatibility)
      }

      // Start transaction for atomic deletion
      await db.query('START TRANSACTION');

      try {
        // 1. Delete all documents associated with this tender (including files)
        const [documents] = await db.query('SELECT id, file_path FROM documents WHERE tender_id = ?', [tenderId]);
        const docsArray = documents as any[];

        for (const doc of docsArray) {
          // Delete physical file if it exists
          if (doc.file_path) {
            try {
              const filePath = getFilePath(doc.file_path);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (fileError) {
              logger.warn({
                message: 'Could not delete document file',
                filePath: doc.file_path,
                error: fileError,
              });
            }
          }
        }

        // Delete document records - use tenderId to ensure correct deletion
        await db.query('DELETE FROM documents WHERE tender_id = ?', [tenderId]);

        // 2. Delete all tender activities - use tenderId
        await db.query('DELETE FROM tender_activities WHERE tender_id = ?', [tenderId]);

        // 3. Delete all tag relations - use tenderId
        await db.query('DELETE FROM tender_tag_relations WHERE tender_id = ?', [tenderId]);

        // 4. Delete email notifications related to this tender - use tenderId
        await db.query('DELETE FROM email_notifications WHERE tender_id = ?', [tenderId]);

        // 5. Delete audit logs related to this tender (optional - you might want to keep these)
        // await db.query('DELETE FROM audit_logs WHERE entity_type = ? AND entity_id = ?', ['Tender', tenderId]);

        // 6. Finally, delete the tender itself - use tenderId and verify it matches
        // Double-check the tender still exists and matches before deletion
        const [verifyTender] = await db.query('SELECT id, tender_number, title, deleted_at FROM tenders WHERE id = ?', [tenderId]);
        const verifyArray = verifyTender as any[];

        if (verifyArray.length === 0) {
          throw new CustomError(`Tender ${tenderId} no longer exists. It may have been deleted by another process.`, 404);
        }

        if (verifyArray[0].id !== tenderId) {
          throw new CustomError(`Tender ID mismatch. Expected ${tenderId}, got ${verifyArray[0].id}`, 500);
        }

        // Log what we're about to delete
        logger.info({
          message: 'About to permanently delete tender',
          tenderId,
          tenderNumber: verifyArray[0].tender_number,
          tenderTitle: verifyArray[0].title,
          deletedAt: verifyArray[0].deleted_at,
        });

        // Perform the deletion
        const [deleteResult] = await db.query('DELETE FROM tenders WHERE id = ?', [tenderId]);
        const deleteResultArray = deleteResult as any;

        // Verify that exactly one row was deleted
        if (deleteResultArray.affectedRows !== 1) {
          logger.error({
            message: 'Unexpected number of rows deleted',
            tenderId,
            expected: 1,
            actual: deleteResultArray.affectedRows,
          });
          throw new CustomError(`Expected to delete 1 tender, but ${deleteResultArray.affectedRows} rows were affected. Transaction rolled back.`, 500);
        }

        // Final verification - ensure the tender is actually gone
        const [finalCheck] = await db.query('SELECT id FROM tenders WHERE id = ?', [tenderId]);
        if ((finalCheck as any[]).length > 0) {
          logger.error({
            message: 'Tender still exists after deletion',
            tenderId,
          });
          throw new CustomError('Tender deletion failed - tender still exists in database', 500);
        }

        // Commit transaction
        await db.query('COMMIT');

        // Log audit
        await db.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user!.userId,
            'PERMANENT_DELETE_TENDER',
            'Tender',
            tenderId,
            req.ip,
            req.get('user-agent') || '',
            JSON.stringify({
              deletedTender: tender.tender_number,
              deletedTitle: tender.title,
              deletedDocuments: docsArray.length,
            }),
          ]
        );

        logger.info({
          message: 'Tender permanently deleted successfully',
          tenderId: tenderId,
          tenderNumber: tender.tender_number,
          tenderTitle: tender.title,
          deletedBy: req.user!.userId,
          deletedDocuments: docsArray.length,
        });

        res.json({
          success: true,
          data: {
            message: `Tender "${tender.tender_number}" and all associated data permanently deleted`,
            deletedTenderId: tenderId,
            deletedTenderNumber: tender.tender_number,
            deletedDocuments: docsArray.length,
          },
        });
      } catch (error: any) {
        // Rollback transaction on error
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Generate AI Summary for a tender
   */
  static async generateSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (error) {
        // If check fails, assume column doesn't exist
        hasDeletedAt = false;
      }

      // Build query with optional deleted_at check
      let query = `SELECT t.*, c.company_name, cat.name as category_name
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN tender_categories cat ON t.category_id = cat.id
         WHERE t.id = ?`;

      if (hasDeletedAt) {
        query += ' AND t.deleted_at IS NULL';
      }

      // Get tender details
      const [tenders] = await db.query(query, [id]);

      const tendersArray = tenders as any[];
      if (tendersArray.length === 0) {
        throw new CustomError('Tender not found', 404);
      }

      const tender = tendersArray[0];

      // Fetch and extract document content
      let documentContents: Array<{ fileName: string; content: string }> = [];
      try {
        // Get all documents for this tender
        const [documents] = await db.query(
          `SELECT file_name, original_name, file_path, mime_type
           FROM documents
           WHERE tender_id = ? AND deleted_at IS NULL
           ORDER BY uploaded_at ASC`,
          [id]
        );

        const documentsArray = documents as any[];
        if (documentsArray.length > 0) {
          // Extract text from documents
          const documentsToExtract = documentsArray.map((doc: any) => ({
            filePath: getFilePath(doc.file_path),
            mimeType: doc.mime_type,
            fileName: doc.original_name || doc.file_name,
          }));

          documentContents = await DocumentExtractor.extractTextFromDocuments(documentsToExtract);
          logger.info({
            message: 'Extracted text from documents for AI summary',
            tenderId: id,
            documentCount: documentContents.length,
          });
        }
      } catch (docError: any) {
        // Log error but continue without documents
        logger.warn({
          message: 'Failed to extract document content, proceeding without documents',
          tenderId: id,
          error: docError.message,
        });
      }

      // Generate summary
      try {
        const summary = await AIService.generateTenderSummary(tender, documentContents);

        // Save summary to database
        const userId = (req as any).user?.id;
        try {
          // Check if ai_summary column exists
          const [columnCheck] = await db.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'leads' 
             AND COLUMN_NAME = 'ai_summary'`
          );
          const hasAiSummaryColumn = (columnCheck as any[]).length > 0;

          if (hasAiSummaryColumn) {
            await db.query(
              `UPDATE tenders 
               SET ai_summary = ?, 
                   ai_summary_generated_at = NOW(),
                   ai_summary_generated_by = ?
               WHERE id = ?`,
              [summary, userId || null, id]
            );
            logger.info({
              message: 'AI summary saved to database',
              tenderId: id,
              summaryLength: summary.length,
              userId: userId || null,
            });
          } else {
            logger.warn({
              message: 'ai_summary column does not exist - summary not saved to DB',
              tenderId: id,
            });
          }
        } catch (dbError: any) {
          // Log but don't fail if DB update fails
          logger.warn({
            message: 'Failed to save AI summary to database',
            tenderId: id,
            error: dbError.message,
          });
        }

        res.json({
          success: true,
          data: { summary }
        });
      } catch (aiError: any) {
        // Provide more helpful error messages for common AI configuration issues
        if (aiError.message && aiError.message.includes('decrypt API key')) {
          throw new CustomError(
            'AI API key decryption failed. Please go to Administration > AI Settings and update your API key configuration. ' +
            'This usually happens when the encryption key has changed or the API key was encrypted with a different key.',
            400
          );
        }
        if (aiError.message && aiError.message.includes('No active AI configuration')) {
          throw new CustomError(
            'No active AI configuration found. Please go to Administration > AI Settings to configure an AI provider.',
            404
          );
        }
        // Re-throw other errors
        throw aiError;
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Chat about a tender - answer questions using AI
   */
  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { question, chatHistory } = req.body;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        throw new CustomError('Question is required', 400);
      }

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (error) {
        hasDeletedAt = false;
      }

      // Build query with optional deleted_at check
      let query = `SELECT t.*, c.company_name, cat.name as category_name
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN tender_categories cat ON t.category_id = cat.id
         WHERE t.id = ?`;

      if (hasDeletedAt) {
        query += ' AND t.deleted_at IS NULL';
      }

      // Get tender details
      const [tenders] = await db.query(query, [id]);
      const tendersArray = tenders as any[];
      if (tendersArray.length === 0) {
        throw new CustomError('Tender not found', 404);
      }

      const tender = tendersArray[0];

      // Check if deleted_at column exists in documents table
      let hasDocumentsDeletedAt = false;
      try {
        const [docColumnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'documents' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        hasDocumentsDeletedAt = (docColumnCheck as any[]).length > 0;
      } catch (error) {
        hasDocumentsDeletedAt = false;
      }

      // Fetch all documents for the tender
      let documentsQuery = `SELECT file_path, mime_type, original_name, file_name FROM documents WHERE tender_id = ?`;
      if (hasDocumentsDeletedAt) {
        documentsQuery += ' AND deleted_at IS NULL';
      }

      const [documents] = await db.query(documentsQuery, [id]);
      const documentsArray = documents as any[];

      // Extract text from documents
      const documentContent: string[] = [];
      for (const doc of documentsArray) {
        try {
          const content = await DocumentExtractor.extractText(
            getFilePath(doc.file_path),
            doc.mime_type
          );
          if (content && content.trim().length > 0) {
            documentContent.push(content);
          }
        } catch (docError: any) {
          logger.warn({
            message: `Failed to extract text from document ${doc.file_path}: ${docError.message}`,
            tenderId: id,
          });
          // Continue processing other documents even if one fails
        }
      }

      // Validate chat history format
      let validChatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        validChatHistory = chatHistory
          .filter((msg: any) =>
            msg &&
            typeof msg.role === 'string' &&
            (msg.role === 'user' || msg.role === 'assistant') &&
            typeof msg.content === 'string' &&
            msg.content.trim().length > 0
          )
          .map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content.trim()
          }))
          .slice(-10); // Limit to last 10 messages to avoid token limits
      }

      // Generate chat response
      try {
        const answer = await AIService.chatAboutTender(
          tender,
          question.trim(),
          validChatHistory,
          documentContent
        );

        res.json({
          success: true,
          data: { answer }
        });
      } catch (aiError: any) {
        // Provide more helpful error messages
        if (aiError.message && aiError.message.includes('decrypt API key')) {
          throw new CustomError(
            'AI API key decryption failed. Please go to Administration > AI Settings and update your API key configuration.',
            400
          );
        }
        if (aiError.message && aiError.message.includes('No active AI configuration')) {
          throw new CustomError(
            'No active AI configuration found. Please go to Administration > AI Settings to configure an AI provider.',
            404
          );
        }
        throw new CustomError(`Failed to generate chat response: ${aiError.message}`, 500);
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send AI summary via email
   */
  static async sendSummaryEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        throw new CustomError('Valid email address is required', 400);
      }

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'tenders' OR TABLE_NAME = 'leads')
           AND COLUMN_NAME = 'deleted_at'
           LIMIT 1`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (error) {
        hasDeletedAt = false;
      }

      // Get tender details
      let query = `SELECT t.*, c.company_name, cat.name as category_name
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN tender_categories cat ON t.category_id = cat.id
         WHERE t.id = ?`;

      if (hasDeletedAt) {
        query += ' AND t.deleted_at IS NULL';
      }

      const [tenders] = await db.query(query, [id]);
      const tendersArray = tenders as any[];
      if (tendersArray.length === 0) {
        throw new CustomError('Tender not found', 404);
      }

      const tender = tendersArray[0];

      // First, try to get summary from the tender object (it might already be there)
      let aiSummary = tender.ai_summary || null;

      // If not in tender object, query directly
      if (!aiSummary || aiSummary.trim().length === 0) {
        try {
          const [summaryCheck] = await db.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'leads' 
             AND COLUMN_NAME = 'ai_summary'`
          );
          const hasAiSummaryColumn = (summaryCheck as any[]).length > 0;

          if (hasAiSummaryColumn) {
            const [summaryResult] = await db.query(
              `SELECT ai_summary FROM tenders WHERE id = ?`,
              [id]
            );
            const summaryArray = summaryResult as any[];
            logger.info({
              message: 'Checking for AI summary',
              tenderId: id,
              hasColumn: hasAiSummaryColumn,
              resultCount: summaryArray.length,
              hasSummary: summaryArray.length > 0 ? !!summaryArray[0].ai_summary : false,
              summaryLength: summaryArray.length > 0 && summaryArray[0].ai_summary ? summaryArray[0].ai_summary.length : 0,
            });

            if (summaryArray.length > 0 && summaryArray[0].ai_summary && summaryArray[0].ai_summary.trim().length > 0) {
              aiSummary = summaryArray[0].ai_summary;
            }
          } else {
            logger.warn({
              message: 'ai_summary column does not exist in tenders table. Please run migration: npm run migrate:ai-summary',
              tenderId: id,
            });
            throw new CustomError(
              'AI summary column does not exist in database. Please run the migration: npm run migrate:ai-summary',
              500
            );
          }
        } catch (error: any) {
          if (error instanceof CustomError) {
            throw error;
          }
          logger.error({
            message: 'Error checking for AI summary',
            tenderId: id,
            error: error.message,
          });
        }
      }

      if (!aiSummary || aiSummary.trim().length === 0) {
        logger.warn({
          message: 'AI summary not found for email',
          tenderId: id,
          summaryExists: !!aiSummary,
          summaryLength: aiSummary ? aiSummary.length : 0,
        });
        throw new CustomError(
          'AI summary not found. Please generate a summary first using the "Generate AI Summary" button.',
          404
        );
      }

      // Format email content
      const subject = `AI Tender Summary - ${tender.tender_number || tender.title}`;
      const htmlBody = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .header { background: linear-gradient(to right, #4f46e5, #7c3aed); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; background: #f9fafb; }
              .summary { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; white-space: pre-wrap; }
              .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
              h1 { margin: 0; }
              h2 { color: #1f2937; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>AI Tender Summary</h1>
              <p style="margin: 5px 0 0 0;">${tender.tender_number || 'N/A'}</p>
            </div>
            <div class="content">
              <h2>Tender Details</h2>
              <p><strong>Title:</strong> ${tender.title || 'N/A'}</p>
              <p><strong>Company:</strong> ${tender.company_name || 'N/A'}</p>
              <p><strong>Category:</strong> ${tender.category_name || 'N/A'}</p>
              <p><strong>Estimated Value:</strong> ${tender.currency || ''} ${tender.estimated_value || 'N/A'}</p>
              <p><strong>Submission Deadline:</strong> ${tender.submission_deadline || 'N/A'}</p>
              
              <div class="summary">
                <h2>Executive Summary</h2>
                ${aiSummary.replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="footer">
              <p>This summary was generated using AI and includes analysis of tender documents.</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `;

      const textBody = `
AI Tender Summary
${tender.tender_number || 'N/A'}

Tender Details:
Title: ${tender.title || 'N/A'}
Company: ${tender.company_name || 'N/A'}
Category: ${tender.category_name || 'N/A'}
Estimated Value: ${tender.currency || ''} ${tender.estimated_value || 'N/A'}
Submission Deadline: ${tender.submission_deadline || 'N/A'}

Executive Summary:
${aiSummary}

---
This summary was generated using AI and includes analysis of tender documents.
Generated on ${new Date().toLocaleString()}
      `;

      // Send email
      await emailService.sendNotification(email, subject, textBody, htmlBody);

      logger.info({
        message: 'AI summary sent via email',
        tenderId: id,
        email,
      });

      res.json({
        success: true,
        message: 'Summary sent successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Convert lead to deal
   */
  static async convertToDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { dealName, dealValue, expectedCloseDate, probability } = req.body;

      // Get lead
      const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [id]);
      const leadArray = leads as any[];
      if (leadArray.length === 0) {
        throw new CustomError('Lead not found', 404);
      }

      const lead = leadArray[0];

      // Create deal
      const [dealResult] = await db.query(
        `INSERT INTO deals (lead_id, deal_name, deal_value, currency, probability, expected_close_date, sales_stage_id, assigned_to, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          dealName || lead.title,
          dealValue || lead.deal_value || lead.estimated_value,
          lead.currency || 'INR',
          probability || 50,
          expectedCloseDate,
          lead.sales_stage_id || ((await db.query('SELECT id FROM sales_stages WHERE name = "New" LIMIT 1'))[0] as any[])?.[0]?.id,
          lead.assigned_to,
          req.user!.userId,
        ]
      );

      const dealId = (dealResult as any).insertId;

      // Update lead to mark as converted
      await db.query(
        'UPDATE leads SET converted_from = NULL, sales_stage_id = (SELECT id FROM sales_stages WHERE name = "Won" LIMIT 1) WHERE id = ?',
        [id]
      );

      res.status(201).json({
        success: true,
        data: { dealId, message: 'Lead converted to deal successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update sales stage
   */
  static async updateStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { salesStageId } = req.body;

      await db.query('UPDATE leads SET sales_stage_id = ? WHERE id = ?', [salesStageId, id]);

      // Log activity
      await db.query(
        `INSERT INTO lead_activities (lead_id, user_id, activity_type, description)
         VALUES (?, ?, ?, ?)`,
        [id, req.user!.userId, 'Status Changed', `Sales stage updated`]
      );

      res.json({
        success: true,
        data: { message: 'Sales stage updated successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get pipeline view
   */
  static async getPipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadTypeId } = req.query;

      // Get all sales stages
      const [stages] = await db.query(
        'SELECT * FROM sales_stages WHERE is_active = TRUE ORDER BY display_order ASC'
      );

      // Get leads grouped by stage
      const pipeline: any = {};
      for (const stage of stages as any[]) {
        let query = `
          SELECT l.*, c.company_name, lt.name as lead_type_name, ss.name as stage_name
          FROM leads l
          LEFT JOIN companies c ON l.company_id = c.id
          LEFT JOIN lead_types lt ON l.lead_type_id = lt.id
          LEFT JOIN sales_stages ss ON l.sales_stage_id = ss.id
          WHERE l.sales_stage_id = ? AND l.deleted_at IS NULL
        `;
        const params: any[] = [stage.id];

        if (leadTypeId) {
          query += ' AND l.lead_type_id = ?';
          params.push(leadTypeId);
        }

        query += ' ORDER BY l.created_at DESC';

        const [leads] = await db.query(query, params);
        pipeline[stage.name] = {
          stage,
          leads: leads as any[],
        };
      }

      res.json({
        success: true,
        data: pipeline,
      });
    } catch (error: any) {
      next(error);
    }
  }
}

