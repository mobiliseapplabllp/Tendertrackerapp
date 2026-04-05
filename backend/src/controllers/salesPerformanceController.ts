import { Request, Response } from 'express';
import db from '../config/database';
import logger from '../utils/logger';

// Helper function to get current year/quarter
const getCurrentPeriod = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: Math.ceil((now.getMonth() + 1) / 3)
  };
};

// Helper function to build date filter
const getDateFilter = (year: number, quarter?: number) => {
  if (quarter) {
    const startMonth = (quarter - 1) * 3;
    const startDate = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
    const endDate = quarter === 4
      ? `${year + 1}-01-01`
      : `${year}-${String((startMonth + 4)).padStart(2, '0')}-01`;
    return { startDate, endDate };
  }
  return {
    startDate: `${year}-01-01`,
    endDate: `${year + 1}-01-01`
  };
};

/**
 * GET /sales/overview
 * Returns company-wide KPIs with breakdown by product line and sub-category
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const { year = getCurrentPeriod().year, quarter } = req.query;
    const numYear = Number(year);
    const numQuarter = quarter ? Number(quarter) : undefined;

    const { startDate, endDate } = getDateFilter(numYear, numQuarter);

    // Get total revenue (won deals)
    const [revenueData] = await db.query(`
      SELECT
        COALESCE(SUM(deal_value), 0) as totalRevenue,
        sub_category,
        COUNT(*) as dealCount
      FROM tenders
      WHERE status = 'Won'
        AND won_date >= ?
        AND won_date < ?
      GROUP BY sub_category
    `, [startDate, endDate]) as any[];

    // Get pipeline value (open deals)
    const [pipelineData] = await db.query(`
      SELECT
        COALESCE(SUM(deal_value), 0) as pipelineValue,
        sub_category,
        COUNT(*) as dealCount
      FROM tenders
      WHERE status NOT IN ('Won', 'Lost', 'Cancelled')
        AND created_at >= ?
        AND created_at < ?
      GROUP BY sub_category
    `, [startDate, endDate]) as any[];

    // Get win/loss stats
    const [winLossData] = await db.query(`
      SELECT
        COUNT(CASE WHEN status = 'Won' THEN 1 END) as winsCount,
        COUNT(CASE WHEN status = 'Lost' THEN 1 END) as lossesCount,
        sub_category
      FROM tenders
      WHERE (won_date >= ? AND won_date < ?)
         OR (lost_date >= ? AND lost_date < ?)
      GROUP BY sub_category
    `, [startDate, endDate, startDate, endDate]) as any[];

    // Get active deals count
    const [activeDealsData] = await db.query(`
      SELECT
        COUNT(*) as activeDeals,
        sub_category
      FROM tenders
      WHERE status NOT IN ('Won', 'Lost', 'Cancelled')
      GROUP BY sub_category
    `) as any[];

    // Get sales targets and attainment
    const [targetData] = await db.query(`
      SELECT
        st.product_line_id,
        st.sub_category,
        COALESCE(SUM(st.target_amount), 0) as targetAmount,
        COALESCE(SUM(t.deal_value), 0) as achievedAmount
      FROM sales_targets st
      LEFT JOIN tenders t ON st.product_line_id = t.product_line_id
        AND st.sub_category = t.sub_category
        AND t.status = 'Won'
        AND t.won_date >= ?
        AND t.won_date < ?
      WHERE st.year = ?
        AND st.quarter = ?
      GROUP BY st.product_line_id, st.sub_category
    `, [startDate, endDate, numYear, numQuarter || 0]) as any[];

    // Get product line breakdown
    const [productLines] = await db.query(`
      SELECT DISTINCT product_line_id
      FROM tenders
      WHERE created_at >= ? AND created_at < ?
      ORDER BY product_line_id
    `, [startDate, endDate]) as any[];

    // Calculate aggregates
    let totalRevenue = 0;
    let totalPipeline = 0;
    let totalWins = 0;
    let totalLosses = 0;
    const subCategoryBreakdown: any = {};

    revenueData.forEach((row: any) => {
      totalRevenue += parseFloat(row.totalRevenue) || 0;
      if (!subCategoryBreakdown[row.sub_category]) {
        subCategoryBreakdown[row.sub_category] = { revenue: 0, deals: 0 };
      }
      subCategoryBreakdown[row.sub_category].revenue += parseFloat(row.totalRevenue) || 0;
      subCategoryBreakdown[row.sub_category].deals += row.dealCount;
    });

    pipelineData.forEach((row: any) => {
      totalPipeline += parseFloat(row.pipelineValue) || 0;
      if (!subCategoryBreakdown[row.sub_category]) {
        subCategoryBreakdown[row.sub_category] = { revenue: 0, deals: 0, pipeline: 0 };
      }
      subCategoryBreakdown[row.sub_category].pipeline = parseFloat(row.pipelineValue) || 0;
    });

    winLossData.forEach((row: any) => {
      totalWins += row.winsCount;
      totalLosses += row.lossesCount;
    });

    const winRate = totalWins + totalLosses > 0
      ? (totalWins / (totalWins + totalLosses) * 100).toFixed(2)
      : '0.00';

    // Calculate target attainment
    let targetAttainment = 0;
    let totalTarget = 0;
    targetData.forEach((row: any) => {
      totalTarget += parseFloat(row.targetAmount) || 0;
      targetAttainment += parseFloat(row.achievedAmount) || 0;
    });
    const attainmentPercent = totalTarget > 0
      ? ((targetAttainment / totalTarget) * 100).toFixed(2)
      : '0.00';

    const activeDealsCount = activeDealsData.reduce((sum: number, row: any) => sum + row.activeDeals, 0);

    // Build product line breakdown
    const productLineBreakdown = productLines.map((pl: any) => {
      const plRevenue = revenueData
        .filter((r: any) => r.product_line_id === pl.product_line_id)
        .reduce((sum: number, r: any) => sum + parseFloat(r.totalRevenue || 0), 0);

      return {
        productLineId: pl.product_line_id,
        revenue: plRevenue,
        pipelineValue: pipelineData
          .filter((p: any) => p.product_line_id === pl.product_line_id)
          .reduce((sum: number, p: any) => sum + parseFloat(p.pipelineValue || 0), 0)
      };
    });

    res.json({
      success: true,
      data: {
        period: { year: numYear, quarter: numQuarter },
        totalRevenue,
        totalPipeline,
        winRate: parseFloat(winRate),
        activeDeals: activeDealsCount,
        targetAttainment: parseFloat(attainmentPercent),
        subCategoryBreakdown,
        productLineBreakdown
      }
    });
  } catch (error) {
    logger.error('Error in getOverview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch overview' });
  }
};

/**
 * GET /sales/product-line/:id
 * Returns performance metrics for a specific product line
 */
export const getProductLinePerformance = async (req: Request, res: Response) => {
  try {
    const { id: productLineId } = req.params;
    const { year = getCurrentPeriod().year, quarter } = req.query;
    const numYear = Number(year);
    const numQuarter = quarter ? Number(quarter) : undefined;

    const { startDate, endDate } = getDateFilter(numYear, numQuarter);

    // Revenue by sub-category
    const [revenueData] = await db.query(`
      SELECT
        sub_category,
        COALESCE(SUM(deal_value), 0) as revenue,
        COUNT(*) as dealCount
      FROM tenders
      WHERE product_line_id = ?
        AND status = 'Won'
        AND won_date >= ?
        AND won_date < ?
      GROUP BY sub_category
    `, [productLineId, startDate, endDate]) as any[];

    // Win/loss stats
    const [winLossData] = await db.query(`
      SELECT
        COUNT(CASE WHEN status = 'Won' THEN 1 END) as wins,
        COUNT(CASE WHEN status = 'Lost' THEN 1 END) as losses
      FROM tenders
      WHERE product_line_id = ?
        AND ((won_date >= ? AND won_date < ?) OR (lost_date >= ? AND lost_date < ?))
    `, [productLineId, startDate, endDate, startDate, endDate]) as any[];

    // Pipeline
    const [pipelineData] = await db.query(`
      SELECT COALESCE(SUM(deal_value), 0) as pipelineValue
      FROM tenders
      WHERE product_line_id = ?
        AND status NOT IN ('Won', 'Lost', 'Cancelled')
    `, [productLineId]) as any[];

    // Target attainment
    const [targetData] = await db.query(`
      SELECT
        COALESCE(SUM(target_amount), 0) as targetAmount,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(deal_value), 0)
           FROM tenders
           WHERE product_line_id = st.product_line_id
           AND sub_category = st.sub_category
           AND status = 'Won'
           AND won_date >= ? AND won_date < ?)
        ), 0) as achievedAmount
      FROM sales_targets st
      WHERE st.product_line_id = ? AND st.year = ? AND st.quarter = ?
    `, [startDate, endDate, productLineId, numYear, numQuarter || 0]) as any[];

    // Team leaderboard
    const [leaderboard] = await db.query(`
      SELECT
        u.user_id,
        u.full_name,
        COALESCE(SUM(t.deal_value), 0) as totalRevenue
      FROM users u
      LEFT JOIN sales_team_assignments sta ON u.user_id = sta.user_id
      LEFT JOIN tenders t ON u.user_id = t.assigned_to
        AND t.status = 'Won'
        AND t.product_line_id = ?
        AND t.won_date >= ?
        AND t.won_date < ?
      WHERE sta.product_line_id = ?
      GROUP BY u.user_id, u.full_name
      ORDER BY totalRevenue DESC
      LIMIT 10
    `, [productLineId, startDate, endDate, productLineId]) as any[];

    // Monthly trend (last 12 months)
    const [monthlyData] = await db.query(`
      SELECT
        DATE_FORMAT(won_date, '%Y-%m') as month,
        COALESCE(SUM(deal_value), 0) as revenue,
        COUNT(*) as dealCount
      FROM tenders
      WHERE product_line_id = ?
        AND status = 'Won'
        AND won_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(won_date, '%Y-%m')
      ORDER BY month ASC
    `, [productLineId]) as any[];

    // Calculate metrics
    const totalRevenue = revenueData.reduce((sum: number, r: any) => sum + parseFloat(r.revenue || 0), 0);
    const { wins = 0, losses = 0 } = winLossData[0] || {};
    const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : '0.00';
    const pipelineValue = parseFloat(pipelineData[0]?.pipelineValue || 0);
    const avgDealSize = revenueData.reduce((sum: number, r: any) => sum + r.dealCount, 0) > 0
      ? (totalRevenue / revenueData.reduce((sum: number, r: any) => sum + r.dealCount, 0)).toFixed(2)
      : '0.00';

    const targetAmount = parseFloat(targetData[0]?.targetAmount || 0);
    const achievedAmount = parseFloat(targetData[0]?.achievedAmount || 0);
    const targetAttainment = targetAmount > 0
      ? ((achievedAmount / targetAmount) * 100).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      data: {
        productLineId,
        revenue: totalRevenue,
        softwareRevenue: revenueData.find((r: any) => r.sub_category === 'Software')?.revenue || 0,
        hardwareRevenue: revenueData.find((r: any) => r.sub_category === 'Hardware')?.revenue || 0,
        targetAttainment: parseFloat(targetAttainment),
        winRate: parseFloat(winRate),
        pipelineValue,
        avgDealSize: parseFloat(avgDealSize),
        dealsWon: wins,
        teamLeaderboard: leaderboard,
        monthlyTrend: monthlyData
      }
    });
  } catch (error) {
    logger.error('Error in getProductLinePerformance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product line performance' });
  }
};

/**
 * GET /sales/team/:productLineId
 * Returns aggregated team performance for a product line
 */
export const getTeamPerformance = async (req: Request, res: Response) => {
  try {
    const { productLineId } = req.params;
    const { year = getCurrentPeriod().year, quarter } = req.query;
    const numYear = Number(year);
    const numQuarter = quarter ? Number(quarter) : undefined;

    const { startDate, endDate } = getDateFilter(numYear, numQuarter);

    // Team summary
    const [teamSummary] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN t.status = 'Won' THEN t.deal_value ELSE 0 END), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN t.status NOT IN ('Won', 'Lost', 'Cancelled') THEN t.deal_value ELSE 0 END), 0) as pipelineValue,
        COUNT(CASE WHEN t.status = 'Won' THEN 1 END) as dealsWon,
        COUNT(CASE WHEN t.status = 'Lost' THEN 1 END) as dealsLost
      FROM tenders t
      WHERE t.product_line_id = ?
        AND ((t.won_date >= ? AND t.won_date < ?) OR (t.lost_date >= ? AND t.lost_date < ?))
    `, [productLineId, startDate, endDate, startDate, endDate]) as any[];

    const summary = teamSummary[0] || {};
    const dealsWon = summary.dealsWon || 0;
    const dealsLost = summary.dealsLost || 0;
    const avgWinRate = dealsWon + dealsLost > 0
      ? ((dealsWon / (dealsWon + dealsLost)) * 100).toFixed(2)
      : '0.00';

    // Get team members with their stats
    const [members] = await db.query(`
      SELECT
        u.user_id,
        u.full_name,
        COALESCE(SUM(CASE WHEN t.status = 'Won' AND t.sub_category = 'Software' THEN t.deal_value ELSE 0 END), 0) as softwareRevenue,
        COALESCE(SUM(CASE WHEN t.status = 'Won' AND t.sub_category = 'Hardware' THEN t.deal_value ELSE 0 END), 0) as hardwareRevenue,
        COALESCE(SUM(CASE WHEN t.status = 'Won' THEN t.deal_value ELSE 0 END), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN t.status = 'Won' THEN 1 END), 0) as dealsWon,
        COALESCE(SUM(CASE WHEN t.status = 'Lost' THEN 1 END), 0) as dealsLost,
        COALESCE(SUM(CASE WHEN t.status NOT IN ('Won', 'Lost', 'Cancelled') THEN t.deal_value ELSE 0 END), 0) as pipelineValue,
        COALESCE(SUM(st.target_amount), 0) as targetAmount
      FROM users u
      LEFT JOIN sales_team_assignments sta ON u.user_id = sta.user_id AND sta.product_line_id = ?
      LEFT JOIN tenders t ON u.user_id = t.assigned_to
        AND t.product_line_id = ?
        AND ((t.won_date >= ? AND t.won_date < ?) OR (t.lost_date >= ? AND t.lost_date < ?))
      LEFT JOIN sales_targets st ON u.user_id = st.assigned_to
        AND st.product_line_id = ?
        AND st.year = ?
        AND st.quarter = ?
      WHERE sta.product_line_id = ?
      GROUP BY u.user_id, u.full_name
      ORDER BY totalRevenue DESC
    `, [productLineId, productLineId, startDate, endDate, startDate, endDate, productLineId, numYear, numQuarter || 0, productLineId]) as any[];

    // Calculate target attainment per member
    const membersWithAttainment = members.map((member: any) => {
      const attainment = member.targetAmount > 0
        ? ((member.totalRevenue / member.targetAmount) * 100).toFixed(2)
        : '0.00';
      const winRate = member.dealsWon + member.dealsLost > 0
        ? ((member.dealsWon / (member.dealsWon + member.dealsLost)) * 100).toFixed(2)
        : '0.00';
      return {
        userId: member.user_id,
        fullName: member.full_name,
        revenue: member.totalRevenue,
        softwareRevenue: member.softwareRevenue,
        hardwareRevenue: member.hardwareRevenue,
        target: member.targetAmount,
        targetAttainment: parseFloat(attainment),
        winRate: parseFloat(winRate),
        dealsWon: member.dealsWon,
        dealsLost: member.dealsLost,
        pipelineValue: member.pipelineValue
      };
    });

    res.json({
      success: true,
      data: {
        productLineId,
        teamSummary: {
          totalRevenue: parseFloat(summary.totalRevenue || 0),
          pipelineValue: parseFloat(summary.pipelineValue || 0),
          dealsWon,
          dealsLost,
          avgWinRate: parseFloat(avgWinRate)
        },
        members: membersWithAttainment
      }
    });
  } catch (error) {
    logger.error('Error in getTeamPerformance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team performance' });
  }
};

/**
 * GET /sales/individual/:userId
 * Returns deep-dive performance metrics for a single user
 */
export const getIndividualPerformance = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { year = getCurrentPeriod().year, quarter, period_type: _period_type, period_year, period_quarter } = req.query;
    // Support both param naming conventions from frontend
    const numYear = Number(period_year || year);
    const rawQuarter = period_quarter || quarter;
    const numQuarter = rawQuarter ? Number(rawQuarter) : undefined;

    const { startDate, endDate } = getDateFilter(numYear, numQuarter);

    // User info
    const [userRows] = await db.query(`
      SELECT id, full_name, email, role FROM users WHERE id = ?
    `, [userId]) as any[];
    const userInfo = userRows[0] || {};

    // Personal KPIs - include active deals (not just won/lost in period)
    const [kpis] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN t.status = 'Won' AND t.sub_category = 'Software' THEN t.deal_value ELSE 0 END), 0) as softwareRevenue,
        COALESCE(SUM(CASE WHEN t.status = 'Won' AND t.sub_category = 'Hardware' THEN t.deal_value ELSE 0 END), 0) as hardwareRevenue,
        COALESCE(SUM(CASE WHEN t.status = 'Won' THEN t.deal_value ELSE 0 END), 0) as totalRevenue,
        COUNT(CASE WHEN t.status = 'Won' THEN 1 END) as dealsWon,
        COUNT(CASE WHEN t.status = 'Lost' THEN 1 END) as dealsLost,
        COALESCE(SUM(CASE WHEN t.status NOT IN ('Won', 'Lost', 'Cancelled') THEN t.deal_value ELSE 0 END), 0) as pipelineValue,
        COALESCE(AVG(CASE WHEN t.status = 'Won' AND t.won_date IS NOT NULL THEN DATEDIFF(t.won_date, t.created_at) END), 0) as avgCycleTime
      FROM tenders t
      WHERE t.assigned_to = ?
        AND (
          (t.status = 'Won' AND t.won_date >= ? AND t.won_date < ?)
          OR (t.status = 'Lost' AND t.lost_date >= ? AND t.lost_date < ?)
          OR (t.status NOT IN ('Won', 'Lost', 'Cancelled'))
        )
    `, [userId, startDate, endDate, startDate, endDate]) as any[];

    // Active deals count (open pipeline)
    const [activeDealRows] = await db.query(`
      SELECT COUNT(*) as activeDeals
      FROM tenders
      WHERE assigned_to = ? AND status NOT IN ('Won', 'Lost', 'Cancelled')
    `, [userId]) as any[];

    // Target data
    const [targetData] = await db.query(`
      SELECT
        COALESCE(SUM(target_value), 0) as totalTarget,
        COALESCE(SUM(CASE WHEN sub_category = 'Software' THEN target_value ELSE 0 END), 0) as softwareTarget,
        COALESCE(SUM(CASE WHEN sub_category = 'Hardware' THEN target_value ELSE 0 END), 0) as hardwareTarget
      FROM sales_targets
      WHERE user_id = ? AND period_year = ?
        ${numQuarter ? 'AND period_quarter = ?' : ''}
    `, numQuarter ? [userId, numYear, numQuarter] : [userId, numYear]) as any[];

    // Product line breakdown with targets and achievements
    const [plBreakdown] = await db.query(`
      SELECT
        pl.id as productLineId,
        pl.name as productLineName,
        COALESCE(SUM(CASE WHEN t.status = 'Won' THEN t.deal_value ELSE 0 END), 0) as achievedValue,
        COALESCE(SUM(CASE WHEN t.status = 'Won' AND t.sub_category = 'Software' THEN t.deal_value ELSE 0 END), 0) as softwareValue,
        COALESCE(SUM(CASE WHEN t.status = 'Won' AND t.sub_category = 'Hardware' THEN t.deal_value ELSE 0 END), 0) as hardwareValue,
        COUNT(CASE WHEN t.status = 'Won' THEN 1 END) as wonDeals,
        COUNT(CASE WHEN t.status NOT IN ('Won', 'Lost', 'Cancelled') THEN 1 END) as activeDeals,
        COALESCE((
          SELECT SUM(st.target_value) FROM sales_targets st
          WHERE st.user_id = ? AND st.product_line_id = pl.id AND st.period_year = ?
            ${numQuarter ? 'AND st.period_quarter = ?' : ''}
        ), 0) as targetValue
      FROM product_lines pl
      LEFT JOIN tenders t ON t.product_line_id = pl.id AND t.assigned_to = ?
        AND (
          (t.status = 'Won' AND t.won_date >= ? AND t.won_date < ?)
          OR (t.status NOT IN ('Won', 'Lost', 'Cancelled'))
        )
      WHERE pl.is_active = 1
      GROUP BY pl.id, pl.name
      HAVING achievedValue > 0 OR targetValue > 0 OR wonDeals > 0 OR activeDeals > 0
      ORDER BY pl.name
    `, numQuarter
      ? [userId, numYear, numQuarter, userId, startDate, endDate]
      : [userId, numYear, userId, startDate, endDate]
    ) as any[];

    // Monthly trend - last 12 months with won values
    const [monthlyTrend] = await db.query(`
      SELECT
        DATE_FORMAT(m.month_date, '%b %Y') as month,
        COALESCE(SUM(t.deal_value), 0) as wonValue,
        COUNT(t.id) as dealCount
      FROM (
        SELECT DATE_FORMAT(DATE_SUB(NOW(), INTERVAL n MONTH), '%Y-%m-01') as month_date
        FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
              UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
              UNION SELECT 9 UNION SELECT 10 UNION SELECT 11) months
      ) m
      LEFT JOIN tenders t ON DATE_FORMAT(t.won_date, '%Y-%m') = DATE_FORMAT(m.month_date, '%Y-%m')
        AND t.assigned_to = ?
        AND t.status = 'Won'
      GROUP BY m.month_date
      ORDER BY m.month_date ASC
    `, [userId]) as any[];

    // Deal history
    const [dealHistory] = await db.query(`
      SELECT
        t.id as tender_id,
        t.title as deal_name,
        t.deal_value,
        t.status,
        t.product_line_id,
        t.sub_category,
        t.won_date,
        t.created_at,
        pl.name as product_line_name
      FROM tenders t
      LEFT JOIN product_lines pl ON t.product_line_id = pl.id
      WHERE t.assigned_to = ?
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [userId]) as any[];

    const kpiData = kpis[0] || {};
    const targetDataRow = targetData[0] || {};

    const totalRevenue = parseFloat(kpiData.totalRevenue || 0);
    const dealsWon = parseInt(kpiData.dealsWon || 0);
    const dealsLost = parseInt(kpiData.dealsLost || 0);
    const activeDeals = parseInt(activeDealRows[0]?.activeDeals || 0);
    const pipelineValue = parseFloat(kpiData.pipelineValue || 0);
    const avgCycleTime = Math.round(parseFloat(kpiData.avgCycleTime || 0));
    const totalTarget = parseFloat(targetDataRow.totalTarget || 0);

    const winRate = dealsWon + dealsLost > 0
      ? (dealsWon / (dealsWon + dealsLost)) * 100
      : 0;

    const avgDealSize = dealsWon > 0 ? totalRevenue / dealsWon : 0;

    res.json({
      success: true,
      data: {
        userId,
        userName: userInfo.full_name || 'User',
        userRole: userInfo.role || '',
        totalTarget,
        totalAchieved: totalRevenue,
        wonDeals: dealsWon,
        lostDeals: dealsLost,
        activeDeals,
        winRate,
        avgDealSize,
        avgCycleTime,
        pipelineValue,
        productLineBreakdown: plBreakdown.map((pl: any) => ({
          productLineId: pl.productLineId,
          productLineName: pl.productLineName,
          targetValue: parseFloat(pl.targetValue || 0),
          achievedValue: parseFloat(pl.achievedValue || 0),
          softwareValue: parseFloat(pl.softwareValue || 0),
          hardwareValue: parseFloat(pl.hardwareValue || 0),
          wonDeals: parseInt(pl.wonDeals || 0),
          activeDeals: parseInt(pl.activeDeals || 0),
        })),
        monthlyTrend: monthlyTrend.map((m: any) => ({
          month: m.month,
          wonValue: parseFloat(m.wonValue || 0),
          pipelineValue: 0,
          dealCount: parseInt(m.dealCount || 0),
        })),
        dealHistory,
      }
    });
  } catch (error) {
    logger.error('Error in getIndividualPerformance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch individual performance' });
  }
};

/**
 * GET /sales/leaderboard
 * Returns ranked list of sales performers
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { productLineId, year = getCurrentPeriod().year, quarter, limit = 50 } = req.query;
    const numYear = Number(year);
    const numQuarter = quarter ? Number(quarter) : undefined;
    const numLimit = Math.min(Number(limit), 500);

    const { startDate, endDate } = getDateFilter(numYear, numQuarter);

    let query = `
      SELECT
        u.user_id,
        u.full_name,
        COALESCE(SUM(CASE WHEN t.sub_category = 'Software' THEN t.deal_value ELSE 0 END), 0) as softwareRevenue,
        COALESCE(SUM(CASE WHEN t.sub_category = 'Hardware' THEN t.deal_value ELSE 0 END), 0) as hardwareRevenue,
        COALESCE(SUM(t.deal_value), 0) as revenue,
        COUNT(CASE WHEN t.status = 'Won' THEN 1 END) as dealsWon,
        COALESCE(SUM(st.target_amount), 0) as targetAmount
      FROM users u
      LEFT JOIN tenders t ON u.user_id = t.assigned_to
        AND t.status = 'Won'
        AND t.won_date >= ?
        AND t.won_date < ?
    `;

    const params: any[] = [startDate, endDate];

    if (productLineId) {
      query += ` AND t.product_line_id = ?`;
      params.push(productLineId);
    }

    query += `
      LEFT JOIN sales_targets st ON u.user_id = st.assigned_to
        AND st.year = ?
        AND st.quarter = ?
    `;
    params.push(numYear, numQuarter || 0);

    if (productLineId) {
      query += ` AND st.product_line_id = ?`;
      params.push(productLineId);
    }

    query += `
      GROUP BY u.user_id, u.full_name
      ORDER BY revenue DESC
      LIMIT ?
    `;
    params.push(numLimit);

    const [leaderboard] = await db.query(query, params) as any[];

    // Calculate win rates and target attainment
    const enrichedLeaderboard = await Promise.all(
      leaderboard.map(async (member: any) => {
        const [winLossData] = await db.query(`
          SELECT
            COUNT(CASE WHEN status = 'Won' THEN 1 END) as wins,
            COUNT(CASE WHEN status = 'Lost' THEN 1 END) as losses
          FROM tenders
          WHERE assigned_to = ?
            AND ((won_date >= ? AND won_date < ?) OR (lost_date >= ? AND lost_date < ?))
        `, [member.user_id, startDate, endDate, startDate, endDate]) as any[];

        const { wins = 0, losses = 0 } = winLossData[0] || {};
        const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : '0.00';
        const targetAttainment = member.targetAmount > 0
          ? ((member.revenue / member.targetAmount) * 100).toFixed(2)
          : '0.00';

        return {
          userId: member.user_id,
          fullName: member.full_name,
          revenue: parseFloat(member.revenue),
          softwareRevenue: parseFloat(member.softwareRevenue),
          hardwareRevenue: parseFloat(member.hardwareRevenue),
          dealsWon: member.dealsWon,
          winRate: parseFloat(winRate),
          targetAttainment: parseFloat(targetAttainment)
        };
      })
    );

    res.json({
      success: true,
      data: {
        leaderboard: enrichedLeaderboard,
        period: { year: numYear, quarter: numQuarter }
      }
    });
  } catch (error) {
    logger.error('Error in getLeaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
};

/**
 * GET /sales/trends
 * Returns monthly revenue and deal trends for the past 12 months
 */
export const getTrends = async (req: Request, res: Response) => {
  try {
    const { productLineId, userId } = req.query;

    let query = `
      SELECT
        DATE_FORMAT(won_date, '%Y-%m') as month,
        sub_category,
        COALESCE(SUM(deal_value), 0) as revenue,
        COUNT(*) as dealCount
      FROM tenders
      WHERE status = 'Won'
        AND won_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    `;

    const params: any[] = [];

    if (productLineId) {
      query += ` AND product_line_id = ?`;
      params.push(productLineId);
    }

    if (userId) {
      query += ` AND assigned_to = ?`;
      params.push(userId);
    }

    query += ` GROUP BY DATE_FORMAT(won_date, '%Y-%m'), sub_category ORDER BY month ASC`;

    const [trends] = await db.query(query, params) as any[];

    // Transform data for easier consumption
    const monthlyData: any = {};
    trends.forEach((row: any) => {
      if (!monthlyData[row.month]) {
        monthlyData[row.month] = { month: row.month, total: 0, Software: 0, Hardware: 0, deals: 0 };
      }
      monthlyData[row.month][row.sub_category] = parseFloat(row.revenue);
      monthlyData[row.month].total += parseFloat(row.revenue);
      monthlyData[row.month].deals += row.dealCount;
    });

    res.json({
      success: true,
      data: {
        trends: Object.values(monthlyData),
        filters: { productLineId, userId }
      }
    });
  } catch (error) {
    logger.error('Error in getTrends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
};

/**
 * GET /sales/pipeline-analysis
 * Returns pipeline funnel and deal velocity analysis
 */
export const getPipelineAnalysis = async (req: Request, res: Response) => {
  try {
    const { productLineId } = req.query;

    let query = `
      SELECT
        sales_stage,
        sub_category,
        COUNT(*) as dealCount,
        COALESCE(SUM(deal_value), 0) as stageValue,
        ROUND(AVG(DATEDIFF(
          CASE
            WHEN sales_stage = 'Closed' THEN won_date
            ELSE NOW()
          END,
          created_at
        )), 2) as avgDaysInStage
      FROM tenders
      WHERE status NOT IN ('Lost', 'Cancelled')
    `;

    const params: any[] = [];

    if (productLineId) {
      query += ` AND product_line_id = ?`;
      params.push(productLineId);
    }

    query += ` GROUP BY sales_stage, sub_category ORDER BY sales_stage ASC`;

    const [pipelineData] = await db.query(query, params) as any[];

    // Calculate funnel percentages (relative to first stage)
    const funnel: any = [];
    let firstStageCount = 0;

    const stageGroups: any = {};
    pipelineData.forEach((row: any) => {
      if (!stageGroups[row.sales_stage]) {
        stageGroups[row.sales_stage] = { dealCount: 0, value: 0, byCategory: {} };
      }
      stageGroups[row.sales_stage].dealCount += row.dealCount;
      stageGroups[row.sales_stage].value += parseFloat(row.stageValue);
      stageGroups[row.sales_stage].byCategory[row.sub_category] = {
        deals: row.dealCount,
        value: parseFloat(row.stageValue),
        avgDaysInStage: row.avgDaysInStage
      };
    });

    const stages = Object.keys(stageGroups);
    if (stages.length > 0) {
      firstStageCount = stageGroups[stages[0]].dealCount;
    }

    Object.entries(stageGroups).forEach(([stage, data]: [string, any]) => {
      const funnelPercent = firstStageCount > 0
        ? ((data.dealCount / firstStageCount) * 100).toFixed(2)
        : '0.00';

      funnel.push({
        stage,
        dealCount: data.dealCount,
        value: data.value,
        funnelPercent: parseFloat(funnelPercent),
        byCategory: data.byCategory
      });
    });

    // Deal velocity analysis for won deals
    const [velocityData] = await db.query(`
      SELECT
        ROUND(AVG(DATEDIFF(won_date, created_at)), 2) as avgCycleDays,
        MIN(DATEDIFF(won_date, created_at)) as minCycleDays,
        MAX(DATEDIFF(won_date, created_at)) as maxCycleDays
      FROM tenders
      WHERE status = 'Won' AND won_date IS NOT NULL
    ` + (productLineId ? ` AND product_line_id = ?` : ''), productLineId ? [productLineId] : []) as any[];

    const velocity = velocityData[0] || { avgCycleDays: 0, minCycleDays: 0, maxCycleDays: 0 };

    res.json({
      success: true,
      data: {
        pipelineFunnel: funnel,
        dealVelocity: {
          avgCycleDays: parseFloat(velocity.avgCycleDays) || 0,
          minCycleDays: velocity.minCycleDays || 0,
          maxCycleDays: velocity.maxCycleDays || 0
        },
        filters: { productLineId }
      }
    });
  } catch (error) {
    logger.error('Error in getPipelineAnalysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline analysis' });
  }
};
