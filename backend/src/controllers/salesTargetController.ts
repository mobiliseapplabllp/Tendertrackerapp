import { Request, Response } from 'express';
import db from '../config/database';
import logger from '../utils/logger';

export const getTargets = async (req: Request, res: Response) => {
  try {
    const { userId, productLineId, subCategory, periodType, year, quarter, status } = req.query;

    let query = `
      SELECT
        st.id,
        st.user_id,
        st.product_line_id,
        st.sub_category,
        st.period_type,
        st.period_year,
        st.period_quarter,
        st.target_value,
        st.target_deals,
        st.achieved_value,
        st.achieved_deals,
        st.status,
        st.set_by,
        st.approved_at,
        st.created_at,
        st.updated_at,
        u.full_name as user_name,
        pl.name as product_line_name
      FROM sales_targets st
      JOIN users u ON st.user_id = u.id
      JOIN product_lines pl ON st.product_line_id = pl.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (userId) {
      query += ' AND st.user_id = ?';
      params.push(userId);
    }

    if (productLineId) {
      query += ' AND st.product_line_id = ?';
      params.push(productLineId);
    }

    if (subCategory) {
      query += ' AND st.sub_category = ?';
      params.push(subCategory);
    }

    if (periodType) {
      query += ' AND st.period_type = ?';
      params.push(periodType);
    }

    if (year) {
      query += ' AND st.period_year = ?';
      params.push(year);
    }

    if (quarter) {
      query += ' AND st.period_quarter = ?';
      params.push(quarter);
    }

    if (status) {
      query += ' AND st.status = ?';
      params.push(status);
    }

    query += ' ORDER BY st.created_at DESC';

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    logger.error('Error fetching targets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch targets',
    });
  }
};

export const createTarget = async (req: Request, res: Response) => {
  try {
    const { productLineId, subCategory, periodType, periodYear, periodQuarter, targetValue, targetDeals } =
      req.body;

    if (!productLineId || !targetValue) {
      return res.status(400).json({ success: false, error: 'productLineId and targetValue are required' });
    }

    // Validate sub_category
    const validSubCategories = ['Software', 'Hardware', 'All'];
    if (subCategory && !validSubCategories.includes(subCategory)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sub_category. Must be Software, Hardware, or All',
      });
    }

    // Auto-resolve Sales Head for this product line
    const [headRows] = await db.query(
      `SELECT upl.user_id, u.full_name
       FROM user_product_lines upl
       JOIN users u ON upl.user_id = u.id
       WHERE upl.product_line_id = ? AND upl.is_sales_head = 1`,
      [productLineId]
    ) as any[];

    if (headRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No Sales Head assigned to this product line. Please assign a Sales Head first.',
      });
    }

    const salesHeadId = headRows[0].user_id;
    const setBy = req.user?.userId;

    const query = `
      INSERT INTO sales_targets
        (user_id, product_line_id, sub_category, period_type, period_year, period_quarter, target_value, target_deals, set_by, status, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        target_value = VALUES(target_value),
        target_deals = VALUES(target_deals),
        set_by = VALUES(set_by),
        status = 'Active',
        updated_at = NOW()
    `;

    const params = [salesHeadId, productLineId, subCategory || 'All', periodType, periodYear, periodQuarter || null, targetValue, targetDeals || null, setBy];

    const result = await db.query(query, params);

    return res.json({
      success: true,
      data: {
        id: (result as any)[0].insertId || null,
        userId: salesHeadId,
        salesHeadName: headRows[0].full_name,
        productLineId,
        subCategory: subCategory || 'All',
        periodType,
        periodYear,
        periodQuarter,
        targetValue,
        targetDeals,
        status: 'Active',
        setBy,
      },
    });
  } catch (error) {
    logger.error('Error creating target:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create target',
    });
  }
};

// POST /sales/targets/:id/distribute — Sales Head distributes target to team members
export const distributeTarget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { distributions } = req.body;
    // distributions: [{ userId: number, targetValue: number, targetDeals?: number }]

    if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
      return res.status(400).json({ success: false, error: 'distributions array is required' });
    }

    // Get the parent target
    const [targetRows] = await db.query('SELECT * FROM sales_targets WHERE id = ?', [id]) as any[];
    if (targetRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Target not found' });
    }

    const parentTarget = targetRows[0];
    const totalDistributed = distributions.reduce((sum: number, d: any) => sum + Number(d.targetValue), 0);

    if (totalDistributed > Number(parentTarget.target_value)) {
      return res.status(400).json({
        success: false,
        error: `Total distributed (${totalDistributed}) exceeds target (${parentTarget.target_value})`,
      });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      for (const dist of distributions) {
        await connection.query(
          `INSERT INTO sales_targets
            (user_id, product_line_id, sub_category, period_type, period_year, period_quarter, target_value, target_deals, set_by, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())
           ON DUPLICATE KEY UPDATE
            target_value = VALUES(target_value),
            target_deals = VALUES(target_deals),
            set_by = VALUES(set_by),
            status = 'Active',
            updated_at = NOW()`,
          [
            dist.userId,
            parentTarget.product_line_id,
            parentTarget.sub_category,
            parentTarget.period_type,
            parentTarget.period_year,
            parentTarget.period_quarter,
            dist.targetValue,
            dist.targetDeals || null,
            req.user?.userId,
          ]
        );
      }

      await connection.commit();
      connection.release();

      return res.json({
        success: true,
        data: { message: `Target distributed to ${distributions.length} team members` },
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    logger.error('Error distributing target:', error);
    return res.status(500).json({ success: false, error: 'Failed to distribute target' });
  }
};

export const updateTarget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetValue, targetDeals, status } = req.body;

    // First, fetch the target to check authorization
    const [targetRows] = await db.query('SELECT * FROM sales_targets WHERE id = ?', [id]);

    if ((targetRows as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Target not found',
      });
    }

    const target = (targetRows as any[])[0];

    // Check authorization: Admin or Sales Head of that product line
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (userRole !== 'Admin') {
      // Check if user is Sales Head of this product line
      const [headRows] = await db.query(
        'SELECT * FROM product_line_heads WHERE product_line_id = ? AND user_id = ? AND role = ?',
        [target.product_line_id, userId, 'Sales Head']
      );

      if ((headRows as any[]).length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to update this target',
        });
      }
    }

    let query = 'UPDATE sales_targets SET ';
    const params: any[] = [];
    const updates: string[] = [];

    if (targetValue !== undefined) {
      updates.push('target_value = ?');
      params.push(targetValue);
    }

    if (targetDeals !== undefined) {
      updates.push('target_deals = ?');
      params.push(targetDeals);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);

      if (status === 'Active') {
        updates.push('approved_at = NOW()');
      }
    }

    updates.push('updated_at = NOW()');

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);

    return res.json({
      success: true,
      data: {
        id,
        targetValue,
        targetDeals,
        status,
      },
    });
  } catch (error) {
    logger.error('Error updating target:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update target',
    });
  }
};

export const bulkSetTargets = async (req: Request, res: Response) => {
  try {
    const { targets } = req.body;

    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'targets must be a non-empty array',
      });
    }

    const setBy = req.user?.userId;
    let createdOrUpdatedCount = 0;

    // Start transaction
    const connection = await (db as any).getConnection();

    try {
      await connection.beginTransaction();

      for (const target of targets) {
        const {
          userId,
          productLineId,
          subCategory,
          periodType,
          periodYear,
          periodQuarter,
          targetValue,
          targetDeals,
        } = target;

        // Validate sub_category
        const validSubCategories = ['Software', 'Hardware', 'All'];
        if (!validSubCategories.includes(subCategory)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'Invalid sub_category. Must be Software, Hardware, or All',
          });
        }

        const query = `
          INSERT INTO sales_targets
            (user_id, product_line_id, sub_category, period_type, period_year, period_quarter, target_value, target_deals, set_by, status, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            target_value = VALUES(target_value),
            target_deals = VALUES(target_deals),
            set_by = VALUES(set_by),
            updated_at = NOW()
        `;

        const params = [
          userId,
          productLineId,
          subCategory,
          periodType,
          periodYear,
          periodQuarter,
          targetValue,
          targetDeals,
          setBy,
        ];

        await connection.query(query, params);
        createdOrUpdatedCount++;
      }

      await connection.commit();

      return res.json({
        success: true,
        data: {
          count: createdOrUpdatedCount,
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('Error bulk setting targets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to bulk set targets',
    });
  }
};

export const copyPeriodTargets = async (req: Request, res: Response) => {
  try {
    const { fromYear, fromQuarter, toYear, toQuarter, productLineId } = req.body;

    if (!fromYear || !toYear || !productLineId) {
      return res.status(400).json({
        success: false,
        error: 'fromYear, toYear, and productLineId are required',
      });
    }

    // Fetch all targets from the source period
    const [sourceTargets] = await db.query(
      `
      SELECT
        user_id,
        product_line_id,
        sub_category,
        period_type,
        target_value,
        target_deals
      FROM sales_targets
      WHERE product_line_id = ?
        AND period_year = ?
        AND period_quarter = ?
    `,
      [productLineId, fromYear, fromQuarter]
    );

    if ((sourceTargets as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No targets found for the source period',
      });
    }

    const setBy = req.user?.userId;
    let copiedCount = 0;

    // Start transaction
    const connection = await (db as any).getConnection();

    try {
      await connection.beginTransaction();

      for (const target of sourceTargets as any[]) {
        const query = `
          INSERT INTO sales_targets
            (user_id, product_line_id, sub_category, period_type, period_year, period_quarter, target_value, target_deals, set_by, status, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            target_value = VALUES(target_value),
            target_deals = VALUES(target_deals),
            set_by = VALUES(set_by),
            status = 'Draft',
            updated_at = NOW()
        `;

        const params = [
          target.user_id,
          target.product_line_id,
          target.sub_category,
          target.period_type,
          toYear,
          toQuarter,
          target.target_value,
          target.target_deals,
          setBy,
        ];

        await connection.query(query, params);
        copiedCount++;
      }

      await connection.commit();

      return res.json({
        success: true,
        data: {
          count: copiedCount,
          fromPeriod: { year: fromYear, quarter: fromQuarter },
          toPeriod: { year: toYear, quarter: toQuarter },
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('Error copying period targets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to copy period targets',
    });
  }
};

export const getTargetSummary = async (req: Request, res: Response) => {
  try {
    const { year, quarter } = req.query;

    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        error: 'year and quarter are required',
      });
    }

    const query = `
      SELECT
        pl.name as product_line_name,
        st.sub_category,
        SUM(st.target_value) as total_target,
        SUM(st.achieved_value) as total_achieved,
        CASE
          WHEN SUM(st.target_value) > 0
          THEN ROUND((SUM(st.achieved_value) / SUM(st.target_value)) * 100, 2)
          ELSE 0
        END as attainment_pct
      FROM sales_targets st
      JOIN product_lines pl ON st.product_line_id = pl.id
      WHERE st.period_year = ? AND st.period_quarter = ?
      GROUP BY st.product_line_id, st.sub_category
      ORDER BY pl.name, st.sub_category
    `;

    const [rows] = await db.query(query, [year, quarter]);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    logger.error('Error fetching target summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch target summary',
    });
  }
};
