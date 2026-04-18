import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { AIService } from '../services/aiService';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';

export class ReportController {
  /**
   * Get dashboard statistics
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      // Build role-based filter
      const user = req.user;
      const isAdmin = user?.role === 'Admin';
      const isSalesHead = user?.isSalesHead;
      const roleFilterParams: any[] = [];
      let roleFilter = '';

      if (!isAdmin && user) {
        if (isSalesHead && user.salesHeadProductLineIds?.length) {
          const plPlaceholders = user.salesHeadProductLineIds.map(() => '?').join(',');
          roleFilter = ` AND product_line_id IN (${plPlaceholders})`;
          roleFilterParams.push(...user.salesHeadProductLineIds);
        } else {
          roleFilter = ` AND (created_by = ? OR assigned_to = ?)`;
          roleFilterParams.push(user.userId, user.userId);
        }
      }

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenders' AND COLUMN_NAME = 'deleted_at'`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (e) { /* skip */ }

      const deletedFilter = hasDeletedAt ? 'deleted_at IS NULL' : '1=1';
      const baseFilter = `WHERE ${deletedFilter}${roleFilter}`;

      // For activity join queries (need table prefix to avoid ambiguity)
      const actRoleFilter = roleFilter.replace(/created_by/g, 't.created_by').replace(/assigned_to/g, 't.assigned_to').replace(/product_line_id/g, 't.product_line_id');

      // Total tenders
      const [totalResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders ${baseFilter}`, [...roleFilterParams]
      );
      const totalTenders = (totalResult as any[])[0].total;

      // Active tenders (not Won, Lost, or Cancelled)
      const activeWhere = baseFilter
        ? `${baseFilter} AND status NOT IN ('Won', 'Lost', 'Cancelled')`
        : `WHERE status NOT IN ('Won', 'Lost', 'Cancelled')`;
      const [activeResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders ${activeWhere}`, [...roleFilterParams]
      );
      const activeTenders = (activeResult as any[])[0].total;

      // Won tenders
      const wonWhere = baseFilter
        ? `${baseFilter} AND status = 'Won'`
        : `WHERE status = 'Won'`;
      const [wonResult] = await db.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(estimated_value), 0) as total_value
         FROM tenders ${wonWhere}`, [...roleFilterParams]
      );
      const wonData = (wonResult as any[])[0];
      const wonTenders = wonData.total;
      const wonValue = parseFloat(wonData.total_value) || 0;

      // Lost tenders
      const lostWhere = baseFilter
        ? `${baseFilter} AND status = 'Lost'`
        : `WHERE status = 'Lost'`;
      const [lostResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders ${lostWhere}`, [...roleFilterParams]
      );
      const lostTenders = (lostResult as any[])[0].total;

      // Total value
      const [totalValueResult] = await db.query(
        `SELECT COALESCE(SUM(estimated_value), 0) as total FROM tenders ${baseFilter}`, [...roleFilterParams]
      );
      const totalValue = parseFloat((totalValueResult as any[])[0].total) || 0;

      // Check if emd_amount and tender_fees columns exist
      let hasEMDColumns = false;
      try {
        const [emdColumnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'emd_amount'`
        );
        hasEMDColumns = (emdColumnCheck as any[]).length > 0;
      } catch (e) {
        // Column doesn't exist
      }

      // Total EMD Amount
      let totalEMD = 0;
      if (hasEMDColumns) {
        try {
          const [totalEMDResult] = await db.query(
            `SELECT COALESCE(SUM(emd_amount), 0) as total FROM tenders ${baseFilter}`, [...roleFilterParams]
          );
          totalEMD = parseFloat((totalEMDResult as any[])[0].total) || 0;
        } catch (e) { /* Column doesn't exist */ }
      }

      // Total Tender Fees
      let totalFees = 0;
      if (hasEMDColumns) {
        try {
          const [totalFeesResult] = await db.query(
            `SELECT COALESCE(SUM(tender_fees), 0) as total FROM tenders ${baseFilter}`, [...roleFilterParams]
          );
          totalFees = parseFloat((totalFeesResult as any[])[0].total) || 0;
        } catch (e) { /* Column doesn't exist */ }
      }

      // Win rate
      const totalCompleted = wonTenders + lostTenders;
      const avgWinRate = totalCompleted > 0 ? (wonTenders / totalCompleted) * 100 : 0;

      // Upcoming deadlines (next 30 days)
      const deadlineBase = baseFilter
        ? `${baseFilter} AND submission_deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY) AND status NOT IN ('Won', 'Lost', 'Cancelled')`
        : `WHERE submission_deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY) AND status NOT IN ('Won', 'Lost', 'Cancelled')`;
      const [deadlineResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders ${deadlineBase}`, [...roleFilterParams]
      );
      const upcomingDeadlines = (deadlineResult as any[])[0].total;

      // Recent activities (filtered by visible tenders)
      let activityFilter = '';
      const activityParams: any[] = [];
      if (!isAdmin && user) {
        if (isSalesHead && user.salesHeadProductLineIds?.length) {
          const plPH = user.salesHeadProductLineIds.map(() => '?').join(',');
          activityFilter = `WHERE t.product_line_id IN (${plPH})`;
          activityParams.push(...user.salesHeadProductLineIds);
        } else {
          activityFilter = `WHERE (t.created_by = ? OR t.assigned_to = ?)`;
          activityParams.push(user.userId, user.userId);
        }
      }
      const [activities] = await db.query(
        `SELECT ta.*, u.full_name as user_name, t.title as tender_title
         FROM tender_activities ta
         LEFT JOIN users u ON ta.user_id = u.id
         LEFT JOIN tenders t ON ta.tender_id = t.id
         ${activityFilter}
         ORDER BY ta.created_at DESC
         LIMIT 10`, activityParams
      );

      // Tenders by status (role-filtered)
      const [statusData] = await db.query(
        `SELECT status, COUNT(*) as count FROM tenders ${baseFilter} GROUP BY status`, [...roleFilterParams]
      );

      // Tenders by category (role-filtered) — uses alias 't' so need prefixed filter
      const aliasedDeletedFilter = hasDeletedAt ? 't.deleted_at IS NULL' : '1=1';
      const aliasedBaseFilter = `WHERE ${aliasedDeletedFilter}${actRoleFilter}`;
      const [categoryData] = await db.query(
        `SELECT tc.name as category, COUNT(*) as count
         FROM tenders t
         LEFT JOIN tender_categories tc ON t.category_id = tc.id
         ${aliasedBaseFilter}
         GROUP BY tc.name`, [...roleFilterParams]
      );

      // User context for frontend
      const userContext = {
        role: user?.role || 'User',
        isSalesHead: !!isSalesHead,
        fullName: user?.fullName || '',
        teamMemberCount: user?.teamMemberIds?.length || 0,
      };

      res.json({
        success: true,
        data: {
          totalTenders,
          activeTenders,
          wonTenders,
          lostTenders,
          totalValue,
          wonValue,
          totalEMD,
          totalFees,
          avgWinRate: Math.round(avgWinRate * 100) / 100,
          upcomingDeadlines,
          recentActivities: activities,
          tendersByStatus: statusData,
          tendersByCategory: categoryData,
          userContext,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get team performance stats (for sales heads)
   */
  static async getTeamPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.isSalesHead) {
        return res.json({ success: true, data: [] });
      }

      const teamMemberIds = user.teamMemberIds || [];
      if (teamMemberIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Include the sales head themselves
      const allIds = [user.userId, ...teamMemberIds];
      const placeholders = allIds.map(() => '?').join(',');

      const [members] = await db.query(
        `SELECT
          u.id, u.full_name, u.email, u.department,
          (SELECT COUNT(*) FROM tenders WHERE (created_by = u.id OR assigned_to = u.id) AND deleted_at IS NULL AND lead_type_id = 1) as tender_count,
          (SELECT COUNT(*) FROM tenders WHERE (created_by = u.id OR assigned_to = u.id) AND deleted_at IS NULL AND lead_type_id = 2) as lead_count,
          (SELECT COUNT(*) FROM tenders WHERE (created_by = u.id OR assigned_to = u.id) AND deleted_at IS NULL AND status = 'Won') as won_count,
          (SELECT COALESCE(SUM(estimated_value), 0) FROM tenders WHERE (created_by = u.id OR assigned_to = u.id) AND deleted_at IS NULL) as total_value,
          (SELECT COALESCE(SUM(estimated_value), 0) FROM tenders WHERE (created_by = u.id OR assigned_to = u.id) AND deleted_at IS NULL AND status = 'Won') as won_value
        FROM users u
        WHERE u.id IN (${placeholders})
        ORDER BY won_value DESC`, allIds
      );

      return res.json({ success: true, data: members });
    } catch (error: any) {
      return next(error);
    }
  }

  /**
   * Get tender reports
   */
  static async getTenderReports(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Check if deleted_at column exists
      let deletedFilter = '';
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((columnCheck as any[]).length > 0) {
          deletedFilter = 'AND t.deleted_at IS NULL';
        }
      } catch (e) {
        // Column doesn't exist, skip filter
      }

      // Total Tenders for the year
      const [totalTendersData] = await db.query(
        `SELECT COUNT(*) as total
         FROM tenders t
         WHERE YEAR(t.created_at) = ? ${deletedFilter}`,
        [year]
      );
      const totalTenders = parseInt((totalTendersData as any[])[0]?.total || 0);

      // Industry Breakdown (using company industry field or company name as fallback)
      const [industryData] = await db.query(
        `SELECT 
          COALESCE(c.industry, 'Unknown') as industry,
          COUNT(*) as count,
          COALESCE(SUM(t.estimated_value), 0) as value
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         WHERE YEAR(t.created_at) = ? ${deletedFilter}
         GROUP BY COALESCE(c.industry, 'Unknown')
         ORDER BY count DESC`,
        [year]
      );

      // Transform industry data
      const industryBreakdown = (industryData as any[]).map((ind: any) => ({
        industry: ind.industry || 'Unknown',
        count: parseInt(ind.count) || 0,
        value: parseFloat(ind.value) || 0,
      }));

      // Top Clients by Performance (by total value of won tenders)
      const [topClientsData] = await db.query(
        `SELECT 
          c.id,
          c.company_name as name,
          COUNT(DISTINCT t.id) as tenders,
          SUM(CASE WHEN t.status = 'Won' THEN 1 ELSE 0 END) as won,
          COALESCE(SUM(CASE WHEN t.status = 'Won' THEN t.estimated_value ELSE 0 END), 0) as value
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         WHERE YEAR(t.created_at) = ? AND c.id IS NOT NULL ${deletedFilter}
         GROUP BY c.id, c.company_name
         HAVING tenders > 0
         ORDER BY value DESC, won DESC
         LIMIT 10`,
        [year]
      );

      // Transform top clients data
      const topClients = (topClientsData as any[]).map((client: any) => ({
        id: client.id,
        name: client.name || 'Unknown',
        tenders: parseInt(client.tenders) || 0,
        won: parseInt(client.won) || 0,
        value: parseFloat(client.value) || 0,
      }));

      res.json({
        success: true,
        data: {
          totalTenders,
          industryBreakdown,
          topClients,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Check if deleted_at column exists
      let deletedFilter = '';
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((columnCheck as any[]).length > 0) {
          deletedFilter = 'AND t.deleted_at IS NULL';
        }
      } catch (e) {
        // Column doesn't exist, skip filter
      }

      // Quarterly Performance
      const [quarterlyData] = await db.query(
        `SELECT 
          QUARTER(t.created_at) as quarter_num,
          COUNT(*) as tenders,
          SUM(CASE WHEN t.status = 'Won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN t.status = 'Lost' THEN 1 ELSE 0 END) as lost,
          COALESCE(SUM(CASE WHEN t.status = 'Won' THEN t.estimated_value ELSE 0 END), 0) as revenue
         FROM tenders t
         WHERE YEAR(t.created_at) = ? ${deletedFilter}
         GROUP BY QUARTER(t.created_at)
         ORDER BY quarter_num ASC`,
        [year]
      );

      // Transform quarterly data
      const quarterlyPerformance = (quarterlyData as any[]).map((q: any) => ({
        quarter: `Q${q.quarter_num}`,
        tenders: parseInt(q.tenders) || 0,
        won: parseInt(q.won) || 0,
        lost: parseInt(q.lost) || 0,
        revenue: parseFloat(q.revenue) || 0,
      }));

      // Win Rate Trend by Month
      const [winRateData] = await db.query(
        `SELECT 
          DATE_FORMAT(t.created_at, '%Y-%m') as month,
          COUNT(*) as total,
          SUM(CASE WHEN t.status = 'Won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN t.status = 'Lost' THEN 1 ELSE 0 END) as lost
         FROM tenders t
         WHERE YEAR(t.created_at) = ? ${deletedFilter}
         GROUP BY DATE_FORMAT(t.created_at, '%Y-%m')
         ORDER BY month ASC`,
        [year]
      );

      // Transform win rate data
      const winRateTrend = (winRateData as any[]).map((m: any) => {
        const total = parseInt(m.total) || 0;
        const won = parseInt(m.won) || 0;
        const lost = parseInt(m.lost) || 0;
        const completed = won + lost;
        const rate = completed > 0 ? (won / completed) * 100 : 0;
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthNum = parseInt(m.month.split('-')[1]) - 1;
        
        return {
          month: monthNames[monthNum] || m.month,
          rate: Math.round(rate * 10) / 10,
          total,
          won,
          lost,
        };
      });

      // Total Revenue for the year (from Won tenders)
      const [revenueData] = await db.query(
        `SELECT COALESCE(SUM(t.estimated_value), 0) as total_revenue
         FROM tenders t
         WHERE YEAR(t.created_at) = ? AND t.status = 'Won' ${deletedFilter}`,
        [year]
      );
      const totalRevenue = parseFloat((revenueData as any[])[0]?.total_revenue || 0);

      // Check if emd_amount and tender_fees columns exist
      let hasEMDColumns = false;
      try {
        const [emdColumnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'emd_amount'`
        );
        hasEMDColumns = (emdColumnCheck as any[]).length > 0;
      } catch (e) {
        // Column doesn't exist
      }

      // Total EMD for the year
      let totalEMD = 0;
      if (hasEMDColumns) {
        try {
          const [emdData] = await db.query(
            `SELECT COALESCE(SUM(t.emd_amount), 0) as total_emd
             FROM tenders t
             WHERE YEAR(t.created_at) = ? ${deletedFilter}`,
            [year]
          );
          totalEMD = parseFloat((emdData as any[])[0]?.total_emd || 0);
        } catch (e) {
          // Column doesn't exist, use default
        }
      }

      // Total Tender Fees for the year
      let totalFees = 0;
      if (hasEMDColumns) {
        try {
          const [feesData] = await db.query(
            `SELECT COALESCE(SUM(t.tender_fees), 0) as total_fees
             FROM tenders t
             WHERE YEAR(t.created_at) = ? ${deletedFilter}`,
            [year]
          );
          totalFees = parseFloat((feesData as any[])[0]?.total_fees || 0);
        } catch (e) {
          // Column doesn't exist, use default
        }
      }

      // Average Win Rate
      const [winRateStats] = await db.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN t.status = 'Won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN t.status = 'Lost' THEN 1 ELSE 0 END) as lost
         FROM tenders t
         WHERE YEAR(t.created_at) = ? ${deletedFilter}`,
        [year]
      );
      const stats = (winRateStats as any[])[0];
      const totalCompleted = (parseInt(stats.won) || 0) + (parseInt(stats.lost) || 0);
      const avgWinRate = totalCompleted > 0 ? ((parseInt(stats.won) || 0) / totalCompleted) * 100 : 0;

      // Average Deal Size (from Won tenders)
      const [dealSizeData] = await db.query(
        `SELECT COALESCE(AVG(t.estimated_value), 0) as avg_deal_size
         FROM tenders t
         WHERE YEAR(t.created_at) = ? AND t.status = 'Won' ${deletedFilter}`,
        [year]
      );
      const avgDealSize = parseFloat((dealSizeData as any[])[0]?.avg_deal_size || 0);

      res.json({
        success: true,
        data: {
          quarterlyPerformance,
          winRateTrend,
          totalRevenue,
          totalEMD,
          totalFees,
          avgWinRate: Math.round(avgWinRate * 10) / 10,
          avgDealSize,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Export data
   */
  static async export(req: Request, res: Response, next: NextFunction) {
    try {
      const format = req.query.format as string || 'csv';
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      if (format !== 'csv' && format !== 'json') {
        throw new CustomError('Invalid format. Supported: csv, json', 400);
      }

      // Check if deleted_at column exists
      let deletedFilter = '';
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((columnCheck as any[]).length > 0) {
          deletedFilter = 'AND t.deleted_at IS NULL';
        }
      } catch (e) {
        // Column doesn't exist, skip filter
      }

      // Check if emd_amount and tender_fees columns exist
      let hasEMDColumns = false;
      try {
        const [emdColumnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'emd_amount'`
        );
        hasEMDColumns = (emdColumnCheck as any[]).length > 0;
      } catch (e) {
        // Column doesn't exist
      }

      // Build SELECT query based on column existence
      const emdFields = hasEMDColumns 
        ? 'COALESCE(t.emd_amount, 0) as "EMD Amount", COALESCE(t.tender_fees, 0) as "Tender Fees",'
        : '0 as "EMD Amount", 0 as "Tender Fees",';

      // Get tenders for the selected year
      const [tenders] = await db.query(
        `SELECT 
          t.tender_number as "Tender Number",
          t.title as "Title",
          t.status as "Status",
          t.priority as "Priority",
          t.estimated_value as "Estimated Value",
          t.currency as "Currency",
          ${emdFields}
          t.submission_deadline as "Deadline",
          DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') as "Created",
          c.company_name as "Company",
          tc.name as "Category",
          u.full_name as "Assigned To"
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN tender_categories tc ON t.category_id = tc.id
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE YEAR(t.created_at) = ? ${deletedFilter}
         ORDER BY t.created_at DESC`,
        [year]
      );

      const data = tenders as any[];
      const headers = ['Tender Number', 'Title', 'Status', 'Priority', 'Estimated Value', 'Currency', 'EMD Amount', 'Tender Fees', 'Deadline', 'Created', 'Company', 'Category', 'Assigned To'];

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="tender-reports-${year}.json"`);
        res.json({ success: true, data });
      } else {
        // CSV format
        const csvRows: string[] = [];
        csvRows.push(headers.join(','));

        data.forEach((row: any) => {
          const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tender-reports-${year}.csv"`);
        res.send(csvRows.join('\n'));
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /reports/team-matrix
   * Returns team members as rows and sales stages as columns with lead counts
   */
  static async getTeamMatrix(_req: Request, res: Response, next: NextFunction) {
    try {
      // Get unique sales stages (deduplicated — stages are duplicated per product line)
      const [stages] = await db.query(
        `SELECT MIN(id) as id, name, MIN(display_order) as display_order, MIN(color) as color,
                MIN(probability) as probability, MAX(is_won) as is_won, MAX(is_lost) as is_lost
         FROM sales_stages WHERE is_active = 1
         GROUP BY name
         ORDER BY MIN(display_order) ASC`
      );

      // Map tender status to stage names (most leads use status, not sales_stage_id)
      // Draft→New, Submitted→Qualified, Under Review→Proposal, Shortlisted→Negotiation, Won→Won, Lost/Cancelled→Lost
      const statusToStage: Record<string, string> = {
        'Draft': 'New', 'Submitted': 'Qualified', 'Under Review': 'Proposal',
        'Shortlisted': 'Negotiation', 'Won': 'Won', 'Lost': 'Lost', 'Cancelled': 'Lost',
      };

      // Get sales team users only (Sales department + team assignments + sales heads)
      const [matrix] = await db.query(`
        SELECT
          u.id as user_id, u.full_name, u.role, u.department,
          t.status as lead_status,
          COUNT(t.id) as lead_count,
          COALESCE(SUM(t.estimated_value), 0) as stage_value
        FROM users u
        LEFT JOIN tenders t ON (t.assigned_to = u.id OR t.created_by = u.id) AND t.deleted_at IS NULL
        WHERE u.status = 'Active'
          AND (u.department = 'Sales' OR u.id IN (
            SELECT DISTINCT team_member_id FROM sales_team_assignments WHERE is_active = 1
            UNION SELECT DISTINCT sales_head_id FROM sales_team_assignments WHERE is_active = 1
          ))
        GROUP BY u.id, u.full_name, u.role, u.department, t.status
        ORDER BY u.full_name
      `);

      // Totals per user
      const [userTotals] = await db.query(`
        SELECT
          u.id as user_id, u.full_name, u.role, u.department,
          COUNT(t.id) as total_leads,
          COUNT(CASE WHEN t.status = 'Won' THEN 1 END) as won_count,
          COUNT(CASE WHEN t.status IN ('Lost','Cancelled') THEN 1 END) as lost_count,
          COALESCE(SUM(t.estimated_value), 0) as total_value,
          COALESCE(SUM(CASE WHEN t.status = 'Won' THEN t.estimated_value ELSE 0 END), 0) as won_value
        FROM users u
        LEFT JOIN tenders t ON (t.assigned_to = u.id OR t.created_by = u.id) AND t.deleted_at IS NULL
        WHERE u.status = 'Active'
          AND (u.department = 'Sales' OR u.id IN (
            SELECT DISTINCT team_member_id FROM sales_team_assignments WHERE is_active = 1
            UNION SELECT DISTINCT sales_head_id FROM sales_team_assignments WHERE is_active = 1
          ))
        GROUP BY u.id, u.full_name, u.role, u.department
      `);

      const stageList = stages as any[];
      const matrixRows = matrix as any[];
      const totalsList = userTotals as any[];

      // Build stage name → stage object map
      const stageByName = new Map<string, any>();
      for (const s of stageList) { stageByName.set(s.name, s); }

      // Build user map
      const userMap = new Map<number, any>();
      for (const total of totalsList) {
        userMap.set(total.user_id, {
          userId: total.user_id,
          fullName: total.full_name,
          role: total.role,
          department: total.department || '',
          totalLeads: total.total_leads || 0,
          wonCount: total.won_count || 0,
          lostCount: total.lost_count || 0,
          totalValue: total.total_value || 0,
          wonValue: total.won_value || 0,
          stages: {} as Record<number, { count: number; value: number }>,
        });
      }

      // Map leads by status → stage
      for (const row of matrixRows) {
        if (!userMap.has(row.user_id) || !row.lead_status) continue;
        const user = userMap.get(row.user_id)!;
        const stageName = statusToStage[row.lead_status] || row.lead_status;
        const stage = stageByName.get(stageName);
        if (stage) {
          const existing = user.stages[stage.id] || { count: 0, value: 0 };
          user.stages[stage.id] = {
            count: existing.count + (row.lead_count || 0),
            value: existing.value + (row.stage_value || 0),
          };
        }
      }

      const users = Array.from(userMap.values()).filter(u => u.fullName);

      res.json({ success: true, data: { stages: stageList, users } });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /reports/team-matrix/leads?userId=X&status=Draft,Submitted
   * Returns the actual lead list for a user + status combination (for hover popup)
   */
  static async getTeamMatrixLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.query.userId as string;
      const statuses = (req.query.status as string || '').split(',').filter(Boolean);

      if (!userId || statuses.length === 0) {
        throw new CustomError('userId and status are required', 400);
      }

      const placeholders = statuses.map(() => '?').join(',');
      const [leads] = await db.query(
        `SELECT t.id, t.title, t.tender_number, t.status, t.estimated_value, t.priority,
                c.company_name, pl.name as product_line_name,
                t.created_at
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN product_lines pl ON t.product_line_id = pl.id
         WHERE (t.assigned_to = ? OR t.created_by = ?)
           AND t.status IN (${placeholders})
           AND t.deleted_at IS NULL
         ORDER BY t.created_at DESC
         LIMIT 20`,
        [userId, userId, ...statuses]
      );

      res.json({ success: true, data: leads });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get AI-generated dashboard summary
   */
  static async aiDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const isAdmin = user?.role === 'Admin';
      const isSalesHead = user?.isSalesHead;
      const roleFilterParams: any[] = [];
      let roleFilter = '';

      if (!isAdmin && user) {
        if (isSalesHead && user.salesHeadProductLineIds?.length) {
          const plPlaceholders = user.salesHeadProductLineIds.map(() => '?').join(',');
          roleFilter = ` AND product_line_id IN (${plPlaceholders})`;
          roleFilterParams.push(...user.salesHeadProductLineIds);
        } else {
          roleFilter = ` AND (created_by = ? OR assigned_to = ?)`;
          roleFilterParams.push(user.userId, user.userId);
        }
      }

      // Check if deleted_at column exists
      let hasDeletedAt = false;
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenders' AND COLUMN_NAME = 'deleted_at'`
        );
        hasDeletedAt = (columnCheck as any[]).length > 0;
      } catch (e) { /* skip */ }

      const deletedFilter = hasDeletedAt ? 'deleted_at IS NULL' : '1=1';
      const baseFilter = `WHERE ${deletedFilter}${roleFilter}`;

      // Total tenders
      const [totalResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders ${baseFilter}`, [...roleFilterParams]
      );
      const totalTenders = (totalResult as any[])[0].total;

      // Active tenders
      const [activeResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders ${baseFilter} AND status NOT IN ('Won', 'Lost', 'Cancelled')`,
        [...roleFilterParams]
      );
      const activeTenders = (activeResult as any[])[0].total;

      // Won tenders
      const [wonResult] = await db.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(estimated_value), 0) as total_value
         FROM tenders ${baseFilter} AND status = 'Won'`, [...roleFilterParams]
      );
      const wonData = (wonResult as any[])[0];
      const wonTenders = wonData.total;
      const wonValue = parseFloat(wonData.total_value) || 0;

      // Lost tenders
      const [lostResult] = await db.query(
        `SELECT COUNT(*) as total FROM tenders ${baseFilter} AND status = 'Lost'`, [...roleFilterParams]
      );
      const lostTenders = (lostResult as any[])[0].total;

      // Total value
      const [totalValueResult] = await db.query(
        `SELECT COALESCE(SUM(estimated_value), 0) as total FROM tenders ${baseFilter}`, [...roleFilterParams]
      );
      const totalValue = parseFloat((totalValueResult as any[])[0].total) || 0;

      // Win rate
      const totalCompleted = wonTenders + lostTenders;
      const winRate = totalCompleted > 0 ? Math.round((wonTenders / totalCompleted) * 100) : 0;

      // Format currency for display
      const formatVal = (v: number) => {
        if (v >= 10000000) return `${(v / 10000000).toFixed(2)} Cr`;
        if (v >= 100000) return `${(v / 100000).toFixed(2)} L`;
        if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
        return v.toFixed(0);
      };

      // Build template-based fallback summary
      let insight = '';
      if (winRate >= 60) {
        insight = 'Strong conversion performance - maintain current strategies.';
      } else if (winRate >= 40) {
        insight = 'Moderate win rate - consider refining proposal quality to improve conversions.';
      } else if (totalCompleted > 0) {
        insight = 'Win rate needs attention - review lost deals for improvement opportunities.';
      } else {
        insight = 'No completed deals yet - focus on moving active leads through the pipeline.';
      }

      const templateSummary = `You have ${totalTenders} leads with ${activeTenders} currently active. Your win rate is ${winRate}% with ${wonTenders} deals won worth ${formatVal(wonValue)}. ${insight}`;

      // Try AI-powered summary, fall back to template
      let summary = templateSummary;
      try {
        const config = await AIService.getDefaultConfig();
        const companyName = await getCompanyName();
        const userName = user?.fullName || 'User';
        const userRole = user?.role || 'User';
        const viewScope = isAdmin ? 'company-wide' : isSalesHead ? 'team' : 'personal';

        const prompt = `You are ${companyName}'s business intelligence analyst generating a dashboard briefing for ${userName} (${userRole}). Based on these ${viewScope} metrics, write a concise 2-3 sentence narrative summary. Do not use markdown formatting. Write in plain professional English.

COMPANY: ${companyName}
USER: ${userName} (${userRole}, viewing ${viewScope} data)

METRICS:
- Total leads/tenders: ${totalTenders}
- Currently active: ${activeTenders}
- Won: ${wonTenders} (value: INR ${formatVal(wonValue)})
- Lost: ${lostTenders}
- Total pipeline value: INR ${formatVal(totalValue)}
- Win rate: ${winRate}%

INSTRUCTIONS:
- Address ${userName} directly (e.g., "Your pipeline..." or "The team's pipeline...")
- Highlight the single most important metric or trend
- Provide one specific, actionable recommendation based on the data
- If win rate is below 40%, emphasize improving conversion
- If pipeline value is high but wins are low, emphasize closing deals
- If active tenders are few, emphasize pipeline building
- Keep it to exactly 2-3 sentences, no more`;

        summary = await AIService.callProvider(config, prompt,
          `You are ${companyName}'s concise business intelligence analyst. Respond with only 2-3 plain text sentences personalized for ${userName}. No markdown, no bullet points, no headers. Be specific about the numbers.`);
      } catch (aiError: any) {
        logger.info({ message: 'AI summary unavailable, using template fallback', error: aiError.message });
        // Keep templateSummary as fallback
      }

      res.json({ success: true, data: { summary } });
    } catch (error: any) {
      next(error);
    }
  }
}

