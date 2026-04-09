import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';

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
}

