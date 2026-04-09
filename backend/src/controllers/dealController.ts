import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class DealController {
  /**
   * Get all deals with filters and pagination
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const search = req.query.search as string;
      const salesStageId = req.query.salesStageId as string;
      const assignedTo = req.query.assignedTo as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const offset = (page - 1) * pageSize;
      let whereClause = '1=1';
      const params: any[] = [];

      if (search) {
        whereClause += ' AND (d.deal_name LIKE ? OR l.title LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (salesStageId) {
        whereClause += ' AND d.sales_stage_id = ?';
        params.push(salesStageId);
      }

      if (assignedTo) {
        whereClause += ' AND d.assigned_to = ?';
        params.push(assignedTo);
      }

      if (dateFrom) {
        whereClause += ' AND d.expected_close_date >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND d.expected_close_date <= ?';
        params.push(dateTo);
      }

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM deals d
         LEFT JOIN (SELECT * FROM tenders) l ON d.lead_id = l.id
         WHERE ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get deals with relations
      const query = `
        SELECT 
          d.*,
          l.title as lead_title,
          l.lead_number,
          ss.name as stage_name,
          ss.probability as stage_probability,
          u.full_name as assigned_user_name,
          creator.full_name as creator_name
        FROM deals d
         LEFT JOIN (SELECT * FROM tenders) l ON d.lead_id = l.id
        LEFT JOIN sales_stages ss ON d.sales_stage_id = ss.id
        LEFT JOIN users u ON d.assigned_to = u.id
        LEFT JOIN users creator ON d.created_by = creator.id
        WHERE ${whereClause}
        ORDER BY d.expected_close_date ASC, d.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [deals] = await db.query(query, [...params, pageSize, offset]);
      const dealsArray = deals as any[];

      // Transform data
      for (const deal of dealsArray) {
        deal.dealValue = deal.deal_value ? parseFloat(deal.deal_value) : null;
        deal.probability = deal.probability || 0;
        deal.weightedValue = deal.dealValue ? (deal.dealValue * deal.probability / 100) : 0;
        deal.expectedCloseDate = deal.expected_close_date;
        deal.createdAt = deal.created_at;
        deal.updatedAt = deal.updated_at;
      }

      res.json({
        success: true,
        data: {
          data: dealsArray,
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
   * Get deal by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [deals] = await db.query(
        `SELECT 
          d.*,
          l.title as lead_title,
          l.lead_number,
          l.company_id,
          c.company_name,
          ss.name as stage_name,
          ss.probability as stage_probability,
          u.full_name as assigned_user_name,
          creator.full_name as creator_name
        FROM deals d
         LEFT JOIN (SELECT * FROM tenders) l ON d.lead_id = l.id
        LEFT JOIN companies c ON l.company_id = c.id
        LEFT JOIN sales_stages ss ON d.sales_stage_id = ss.id
        LEFT JOIN users u ON d.assigned_to = u.id
        LEFT JOIN users creator ON d.created_by = creator.id
        WHERE d.id = ?`,
        [id]
      );

      const dealsArray = deals as any[];
      if (dealsArray.length === 0) {
        throw new CustomError('Deal not found', 404);
      }

      const deal = dealsArray[0];
      deal.dealValue = deal.deal_value ? parseFloat(deal.deal_value) : null;
      deal.probability = deal.probability || 0;
      deal.weightedValue = deal.dealValue ? (deal.dealValue * deal.probability / 100) : 0;
      deal.expectedCloseDate = deal.expected_close_date;
      deal.createdAt = deal.created_at;
      deal.updatedAt = deal.updated_at;

      res.json({
        success: true,
        data: deal,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create deal
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, dealName, dealValue, currency, salesStageId, probability, expectedCloseDate, assignedTo } = req.body;

      if (!leadId || !dealName || !dealValue || !salesStageId) {
        throw new CustomError('Lead ID, deal name, deal value, and sales stage are required', 400);
      }

      // Verify lead exists - use tenders table initially
      const [leads] = await db.query('SELECT id FROM tenders WHERE id = ?', [leadId]);
      if ((leads as any[]).length === 0) {
        throw new CustomError('Lead not found', 404);
      }

      const [result] = await db.query(
        `INSERT INTO deals (lead_id, deal_name, deal_value, currency, sales_stage_id, probability, expected_close_date, assigned_to, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          leadId,
          dealName,
          dealValue,
          currency || 'INR',
          salesStageId,
          probability || 0,
          expectedCloseDate || null,
          assignedTo || null,
          req.user!.userId,
        ]
      );

      const insertResult = result as any;
      const dealId = insertResult.insertId;

      logger.info({
        message: 'Deal created',
        dealId,
        leadId,
        createdBy: req.user!.userId,
      });

      // Get created deal
      const [deals] = await db.query(
        `SELECT d.*, l.title as lead_title, ss.name as stage_name
         FROM deals d
         LEFT JOIN (SELECT * FROM tenders) l ON d.lead_id = l.id
         LEFT JOIN sales_stages ss ON d.sales_stage_id = ss.id
         WHERE d.id = ?`,
        [dealId]
      );

      res.status(201).json({
        success: true,
        data: (deals as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update deal
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if deal exists
      const [existing] = await db.query('SELECT * FROM deals WHERE id = ?', [id]);
      if ((existing as any[]).length === 0) {
        throw new CustomError('Deal not found', 404);
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (updateData.dealName !== undefined) {
        updates.push('deal_name = ?');
        params.push(updateData.dealName);
      }
      if (updateData.dealValue !== undefined) {
        updates.push('deal_value = ?');
        params.push(updateData.dealValue);
      }
      if (updateData.currency !== undefined) {
        updates.push('currency = ?');
        params.push(updateData.currency);
      }
      if (updateData.salesStageId !== undefined) {
        updates.push('sales_stage_id = ?');
        params.push(updateData.salesStageId);
      }
      if (updateData.probability !== undefined) {
        updates.push('probability = ?');
        params.push(updateData.probability);
      }
      if (updateData.expectedCloseDate !== undefined) {
        updates.push('expected_close_date = ?');
        params.push(updateData.expectedCloseDate);
      }
      if (updateData.assignedTo !== undefined) {
        updates.push('assigned_to = ?');
        params.push(updateData.assignedTo);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await db.query(
        `UPDATE deals SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      logger.info({
        message: 'Deal updated',
        dealId: id,
        updatedBy: req.user!.userId,
      });

      // Get updated deal
      const [deals] = await db.query(
        `SELECT d.*, l.title as lead_title, ss.name as stage_name
         FROM deals d
         LEFT JOIN (SELECT * FROM tenders) l ON d.lead_id = l.id
         LEFT JOIN sales_stages ss ON d.sales_stage_id = ss.id
         WHERE d.id = ?`,
        [id]
      );

      res.json({
        success: true,
        data: (deals as any[])[0],
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete deal
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [result] = await db.query('DELETE FROM deals WHERE id = ?', [id]);
      const deleteResult = result as any;

      if (deleteResult.affectedRows === 0) {
        throw new CustomError('Deal not found', 404);
      }

      logger.info({
        message: 'Deal deleted',
        dealId: id,
        deletedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: { message: 'Deal deleted successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get sales forecast
   */
  static async getForecast(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = 'month', dateFrom, dateTo } = req.query;

      let dateFilter = '';
      const params: any[] = [];

      if (dateFrom && dateTo) {
        dateFilter = 'AND d.expected_close_date BETWEEN ? AND ?';
        params.push(dateFrom, dateTo);
      } else if (period === 'month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        dateFilter = 'AND d.expected_close_date BETWEEN ? AND ?';
        params.push(startOfMonth, endOfMonth);
      } else if (period === 'quarter') {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        const endOfQuarter = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
        dateFilter = 'AND d.expected_close_date BETWEEN ? AND ?';
        params.push(startOfQuarter, endOfQuarter);
      } else if (period === 'year') {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        dateFilter = 'AND d.expected_close_date BETWEEN ? AND ?';
        params.push(startOfYear, endOfYear);
      }

      // RBAC filter for deals (via lead_id → tenders)
      let rbacFilter = '';
      const rbacParams: any[] = [];
      const user = req.user;
      const isAdmin = user?.role === 'Admin';
      if (!isAdmin && user) {
        if (user.isSalesHead && user.salesHeadProductLineIds?.length) {
          const ph = user.salesHeadProductLineIds.map(() => '?').join(',');
          rbacFilter = ` AND t.product_line_id IN (${ph})`;
          rbacParams.push(...user.salesHeadProductLineIds);
        } else {
          rbacFilter = ` AND (t.created_by = ? OR t.assigned_to = ?)`;
          rbacParams.push(user.userId, user.userId);
        }
      }

      // Get forecast data
      const [forecast] = await db.query(
        `SELECT
          COUNT(*) as totalDeals,
          SUM(d.deal_value) as totalValue,
          SUM(d.deal_value * d.probability / 100) as weightedValue,
          AVG(d.probability) as avgProbability,
          COUNT(CASE WHEN ss.name = 'Won' THEN 1 END) as wonDeals,
          SUM(CASE WHEN ss.name = 'Won' THEN d.deal_value ELSE 0 END) as wonValue
         FROM deals d
         LEFT JOIN sales_stages ss ON d.sales_stage_id = ss.id
         LEFT JOIN tenders t ON d.lead_id = t.id
         WHERE d.expected_close_date IS NOT NULL ${dateFilter}${rbacFilter}`,
        [...params, ...rbacParams]
      );

      const forecastData = (forecast as any[])[0];

      // Get forecast by stage
      const [byStage] = await db.query(
        `SELECT 
          ss.name as stage_name,
          COUNT(d.id) as deal_count,
          SUM(d.deal_value) as total_value,
          SUM(d.deal_value * d.probability / 100) as weighted_value
         FROM sales_stages ss
         LEFT JOIN deals d ON ss.id = d.sales_stage_id AND d.expected_close_date IS NOT NULL ${dateFilter}
         WHERE ss.is_active = TRUE
         GROUP BY ss.id, ss.name
         ORDER BY ss.display_order ASC`,
        params
      );

      res.json({
        success: true,
        data: {
          period,
          metrics: {
            totalDeals: parseInt(forecastData.totalDeals) || 0,
            totalValue: parseFloat(forecastData.totalValue) || 0,
            weightedValue: parseFloat(forecastData.weightedValue) || 0,
            avgProbability: parseFloat(forecastData.avgProbability) || 0,
            wonDeals: parseInt(forecastData.wonDeals) || 0,
            wonValue: parseFloat(forecastData.wonValue) || 0,
          },
          byStage: byStage as any[],
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

