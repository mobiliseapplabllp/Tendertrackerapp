import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class PipelineController {

  /** Build RBAC WHERE clause for tenders */
  private static getRBACFilter(req: Request, alias: string = 'l'): { clause: string; params: any[] } {
    const user = req.user;
    const isAdmin = user?.role === 'Admin';
    if (isAdmin || !user) return { clause: '', params: [] };

    const isSalesHead = user.isSalesHead;
    if (isSalesHead && user.salesHeadProductLineIds?.length) {
      const ph = user.salesHeadProductLineIds.map(() => '?').join(',');
      return { clause: ` AND ${alias}.product_line_id IN (${ph})`, params: [...user.salesHeadProductLineIds] };
    }
    return { clause: ` AND (${alias}.created_by = ? OR ${alias}.assigned_to = ?)`, params: [user.userId, user.userId] };
  }

  /**
   * Get pipeline view with all stages and leads
   */
  static async getPipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadTypeId } = req.query;

      // Get all active sales stages ordered by display_order
      const [stages] = await db.query(
        'SELECT * FROM sales_stages WHERE is_active = TRUE ORDER BY display_order ASC, name ASC'
      );

      const stagesArray = stages as any[];
      const pipeline: any = {};

      // Get leads for each stage
      for (const stage of stagesArray) {
        let query = `
          SELECT l.*, 
            c.company_name, 
            lt.name as lead_type_name, 
            ss.name as stage_name,
            u.full_name as assigned_user_name
          FROM (SELECT * FROM tenders) l
          LEFT JOIN companies c ON l.company_id = c.id
          LEFT JOIN lead_types lt ON l.lead_type_id = lt.id
          LEFT JOIN sales_stages ss ON l.sales_stage_id = ss.id
          LEFT JOIN users u ON l.assigned_to = u.id
          WHERE l.sales_stage_id = ? AND l.deleted_at IS NULL
        `;
        const params: any[] = [stage.id];

        // RBAC filter
        const rbac = PipelineController.getRBACFilter(req, 'l');
        query += rbac.clause;
        params.push(...rbac.params);

        if (leadTypeId) {
          query += ' AND l.lead_type_id = ?';
          params.push(leadTypeId);
        }

        query += ' ORDER BY l.created_at DESC';

        const [leads] = await db.query(query, params);
        const leadsArray = leads as any[];

        // Transform leads
        const transformedLeads = leadsArray.map((lead: any) => ({
          id: lead.id,
          leadNumber: lead.lead_number || lead.tender_number,
          title: lead.title,
          companyName: lead.company_name,
          leadTypeName: lead.lead_type_name,
          dealValue: lead.deal_value ? parseFloat(lead.deal_value) : null,
          probability: lead.probability || 0,
          currency: lead.currency || 'INR',
          assignedUserName: lead.assigned_user_name,
          expectedCloseDate: lead.expected_close_date,
          createdAt: lead.created_at,
        }));

        pipeline[stage.name] = {
          stage: {
            id: stage.id,
            name: stage.name,
            description: stage.description,
            probability: stage.probability,
            stageOrder: stage.display_order,
          },
          leads: transformedLeads,
          totalValue: transformedLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0),
          weightedValue: transformedLeads.reduce((sum, l) => sum + ((l.dealValue || 0) * (l.probability || 0) / 100), 0),
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

  /**
   * Get pipeline analytics
   */
  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadTypeId, dateFrom, dateTo } = req.query;

      let whereClause = 'l.deleted_at IS NULL';
      const params: any[] = [];

      // RBAC filter
      const rbac = PipelineController.getRBACFilter(req, 'l');
      whereClause += rbac.clause;
      params.push(...rbac.params);

      if (leadTypeId) {
        whereClause += ' AND l.lead_type_id = ?';
        params.push(leadTypeId);
      }

      if (dateFrom) {
        whereClause += ' AND l.created_at >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND l.created_at <= ?';
        params.push(dateTo);
      }

      // Get pipeline metrics
      // Active tenders are those not in Lost, Cancelled, or Won stages (pending outcome)
      const [metrics] = await db.query(
        `SELECT 
          COUNT(*) as totalLeads,
          SUM(l.deal_value) as totalValue,
          SUM(l.deal_value * l.probability / 100) as weightedValue,
          AVG(l.probability) as avgProbability,
          COUNT(CASE WHEN l.sales_stage_id = (SELECT id FROM sales_stages WHERE name = 'Won' LIMIT 1) THEN 1 END) as wonCount,
          COUNT(CASE WHEN l.sales_stage_id = (SELECT id FROM sales_stages WHERE name = 'Lost' LIMIT 1) THEN 1 END) as lostCount,
          COUNT(CASE 
            WHEN l.sales_stage_id NOT IN (
              SELECT id FROM sales_stages WHERE name IN ('Won', 'Lost', 'Cancelled')
            ) THEN 1 
          END) as activeCount
         FROM (SELECT * FROM tenders) l
         WHERE ${whereClause}`,
        params
      );

      const metricsData = (metrics as any[])[0];

      // Get leads by stage
      const [byStage] = await db.query(
        `SELECT 
          ss.name as stage_name,
          ss.probability as stage_probability,
          COUNT(l.id) as lead_count,
          SUM(l.deal_value) as total_value,
          SUM(l.deal_value * l.probability / 100) as weighted_value
         FROM sales_stages ss
         LEFT JOIN tenders l ON ss.id = l.sales_stage_id AND ${whereClause.replace('l.', 'l.')}
         WHERE ss.is_active = TRUE
         GROUP BY ss.id, ss.name, ss.probability
         ORDER BY ss.display_order ASC`,
        params
      );

      // Get activity stats
      let activityWhereClause = 'created_at IS NOT NULL';
      const activityParams: any[] = [];

      if (dateFrom) {
        activityWhereClause += ' AND created_at >= ?';
        activityParams.push(dateFrom);
      }

      if (dateTo) {
        activityWhereClause += ' AND created_at <= ?';
        activityParams.push(dateTo);
      }

      const [activities] = await db.query(
        `SELECT activity_type, COUNT(*) as count
         FROM lead_activities
         WHERE ${activityWhereClause}
         GROUP BY activity_type`,
        activityParams
      );

      // Map to ensure numeric values
      const byStageMapped = (byStage as any[]).map(s => ({
        ...s,
        lead_count: s.lead_count ? parseInt(s.lead_count) : 0,
        total_value: s.total_value ? parseFloat(s.total_value) : 0,
        weighted_value: s.weighted_value ? parseFloat(s.weighted_value) : 0,
      }));

      const activitiesMapped = (activities as any[]).map(a => ({
        ...a,
        count: a.count ? parseInt(a.count) : 0,
      }));

      res.json({
        success: true,
        data: {
          metrics: {
            totalLeads: parseInt(metricsData.activeCount) || 0, // Use activeCount as the main total as per user request
            totalAllLeads: parseInt(metricsData.totalLeads) || 0, // Keep tracking total for reference
            totalValue: parseFloat(metricsData.totalValue) || 0,
            weightedValue: parseFloat(metricsData.weightedValue) || 0,
            avgProbability: parseFloat(metricsData.avgProbability) || 0,
            wonCount: parseInt(metricsData.wonCount) || 0,
            lostCount: parseInt(metricsData.lostCount) || 0,
            winRate: metricsData.wonCount && metricsData.totalLeads
              ? (parseInt(metricsData.wonCount) / parseInt(metricsData.totalLeads)) * 100
              : 0,
          },
          byStage: byStageMapped,
          activities: activitiesMapped,
        },
      });

    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update stage order
   */
  static async updateStageOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { stages } = req.body; // Array of { id, stageOrder }

      if (!Array.isArray(stages)) {
        throw new CustomError('Stages must be an array', 400);
      }

      // Update each stage's order
      for (const stage of stages) {
        await db.query(
          'UPDATE sales_stages SET display_order = ? WHERE id = ?',
          [stage.stageOrder, stage.id]
        );
      }

      logger.info({
        message: 'Pipeline stage order updated',
        updatedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: { message: 'Stage order updated successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

