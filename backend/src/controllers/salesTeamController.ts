import { Request, Response } from 'express';
import db from '../config/database';
import logger from '../utils/logger';

// GET /sales/team-structure
export const getTeamStructure = async (req: Request, res: Response) => {
  try {
    const productLineId = req.query.productLineId;

    let query = `
      SELECT
        pl.id,
        pl.name,
        upl.user_id as sales_head_id,
        u.full_name as sales_head_name,
        u.email as sales_head_email
      FROM product_lines pl
      LEFT JOIN user_product_lines upl ON pl.id = upl.product_line_id AND upl.is_sales_head = 1
      LEFT JOIN users u ON upl.user_id = u.id
    `;

    const params: any[] = [];

    if (productLineId) {
      query += ' WHERE pl.id = ?';
      params.push(productLineId);
    }

    const [productLines] = await db.query(query, params);

    // Fetch team members for each product line
    const teamStructure = await Promise.all(
      (productLines as any[]).map(async (productLine) => {
        const [members] = await db.query(
          `
          SELECT DISTINCT
            u.id,
            u.full_name,
            u.email,
            u.department
          FROM sales_team_assignments sta
          JOIN users u ON sta.team_member_id = u.id
          WHERE sta.product_line_id = ? AND sta.is_active = true
          `,
          [productLine.id]
        );

        return {
          id: productLine.id,
          name: productLine.name,
          salesHead: productLine.sales_head_id
            ? {
                id: productLine.sales_head_id,
                fullName: productLine.sales_head_name,
                email: productLine.sales_head_email,
              }
            : null,
          members: (members as any[]).map((m) => ({
            id: m.id,
            fullName: m.full_name,
            email: m.email,
            department: m.department,
          })),
        };
      })
    );

    return res.json({ success: true, data: teamStructure });
  } catch (error) {
    logger.error('Error fetching team structure:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch team structure' });
  }
};

// GET /sales/team-structure/:productLineId
export const getTeamByProductLine = async (req: Request, res: Response) => {
  try {
    const { productLineId } = req.params;

    const [productLines] = await db.query(
      `
      SELECT
        pl.id,
        pl.name,
        upl.user_id as sales_head_id,
        u.full_name as sales_head_name,
        u.email as sales_head_email
      FROM product_lines pl
      LEFT JOIN user_product_lines upl ON pl.id = upl.product_line_id AND upl.is_sales_head = 1
      LEFT JOIN users u ON upl.user_id = u.id
      WHERE pl.id = ?
      `,
      [productLineId]
    );

    if ((productLines as any[]).length === 0) {
      return res.status(404).json({ success: false, error: 'Product line not found' });
    }

    const productLine = (productLines as any[])[0];

    const [members] = await db.query(
      `
      SELECT DISTINCT
        u.id,
        u.full_name,
        u.email,
        u.department
      FROM sales_team_assignments sta
      JOIN users u ON sta.team_member_id = u.id
      WHERE sta.product_line_id = ? AND sta.is_active = true
      `,
      [productLineId]
    );

    const teamData = {
      id: productLine.id,
      name: productLine.name,
      salesHead: productLine.sales_head_id
        ? {
            id: productLine.sales_head_id,
            fullName: productLine.sales_head_name,
            email: productLine.sales_head_email,
          }
        : null,
      members: (members as any[]).map((m) => ({
        id: m.id,
        fullName: m.full_name,
        email: m.email,
        department: m.department,
      })),
    };

    return res.json({ success: true, data: teamData });
  } catch (error) {
    logger.error('Error fetching team by product line:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
};

// POST /sales/team-structure/assign-head
export const assignHead = async (req: Request, res: Response) => {
  try {
    const { userId, productLineId } = req.body;

    // Admin, Manager, or User can assign (broadened for operational flexibility)
    if (!['Admin', 'Manager', 'User'].includes(req.user?.role || '')) {
      logger.warn(`assignHead rejected: role=${req.user?.role}, userId=${req.user?.userId}`);
      return res.status(403).json({ success: false, error: 'Insufficient permissions to assign sales head' });
    }

    if (!userId || !productLineId) {
      return res
        .status(400)
        .json({ success: false, error: 'userId and productLineId are required' });
    }

    logger.info(`Assigning sales head: userId=${userId}, productLineId=${productLineId}, by=${req.user?.userId}`);

    // Ensure is_sales_head column exists BEFORE transaction (ALTER TABLE causes implicit commit)
    try {
      const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_product_lines' AND COLUMN_NAME = 'is_sales_head'`
      );
      if ((cols as any[]).length === 0) {
        await db.query('ALTER TABLE user_product_lines ADD COLUMN is_sales_head TINYINT(1) DEFAULT 0');
        logger.info('Created is_sales_head column on user_product_lines');
      }
    } catch (colErr: any) {
      logger.warn(`Column check/create warning: ${colErr.message}`);
    }

    // Start transaction for the actual assignment
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Remove existing sales head for this product line
      logger.info(`Step 1: Clearing existing sales head for productLineId=${productLineId}`);
      await connection.query(
        'UPDATE user_product_lines SET is_sales_head = 0 WHERE product_line_id = ? AND is_sales_head = 1',
        [productLineId]
      );

      // Check if user exists in user_product_lines for this product line
      logger.info(`Step 2: Checking if user ${userId} exists in user_product_lines for PL ${productLineId}`);
      const [existing] = await connection.query(
        'SELECT id FROM user_product_lines WHERE user_id = ? AND product_line_id = ?',
        [userId, productLineId]
      );

      if ((existing as any[]).length === 0) {
        logger.info(`Step 3: Inserting new row for user ${userId} in PL ${productLineId}`);
        await connection.query(
          'INSERT INTO user_product_lines (user_id, product_line_id, is_sales_head) VALUES (?, ?, 1)',
          [userId, productLineId]
        );
      } else {
        logger.info(`Step 3: Updating existing row for user ${userId} in PL ${productLineId}`);
        await connection.query(
          'UPDATE user_product_lines SET is_sales_head = 1 WHERE user_id = ? AND product_line_id = ?',
          [userId, productLineId]
        );
      }

      await connection.commit();
      logger.info(`Step 4: Transaction committed for userId=${userId}, productLineId=${productLineId}`);
      connection.release();

      // Log to sales_team_history (non-critical, outside transaction)
      try {
        await db.query(
          `INSERT INTO sales_team_history (action, user_id, product_line_id, performed_by, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          ['promoted_head', userId, productLineId, req.user?.userId]
        );
      } catch (histErr: any) {
        logger.warn(`Could not log to sales_team_history: ${histErr.message}`);
      }

      logger.info(`Sales head assigned successfully: userId=${userId}, productLineId=${productLineId}`);

      // Fetch and return updated team
      const [updatedTeam] = await db.query(
        `
        SELECT
          pl.id,
          pl.name,
          upl.user_id as sales_head_id,
          u.full_name as sales_head_name,
          u.email as sales_head_email
        FROM product_lines pl
        LEFT JOIN user_product_lines upl ON pl.id = upl.product_line_id AND upl.is_sales_head = 1
        LEFT JOIN users u ON upl.user_id = u.id
        WHERE pl.id = ?
        `,
        [productLineId]
      );

      const productLine = (updatedTeam as any[])[0];

      const [members] = await db.query(
        `
        SELECT DISTINCT
          u.id,
          u.full_name,
          u.email,
          u.department
        FROM sales_team_assignments sta
        JOIN users u ON sta.team_member_id = u.id
        WHERE sta.product_line_id = ? AND sta.is_active = true
        `,
        [productLineId]
      );

      const teamData = {
        id: productLine.id,
        name: productLine.name,
        salesHead: productLine.sales_head_id
          ? {
              id: productLine.sales_head_id,
              fullName: productLine.sales_head_name,
              email: productLine.sales_head_email,
            }
          : null,
        members: (members as any[]).map((m) => ({
          id: m.id,
          fullName: m.full_name,
          email: m.email,
          department: m.department,
        })),
      };

      return res.json({ success: true, data: teamData });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error: any) {
    logger.error('Error assigning sales head:', error);
    return res.status(500).json({ success: false, error: `Failed to assign sales head: ${error.message || 'Unknown error'}` });
  }
};

// POST /sales/team-structure/add-member
export const addMember = async (req: Request, res: Response) => {
  try {
    const { userId, productLineId } = req.body;

    if (!userId || !productLineId) {
      return res
        .status(400)
        .json({ success: false, error: 'userId and productLineId are required' });
    }

    // Check authorization: Admin or Sales Head of this product line
    const [salesHeadCheck] = await db.query(
      `SELECT user_id FROM user_product_lines
       WHERE product_line_id = ? AND is_sales_head = 1`,
      [productLineId]
    );

    const isAdmin = req.user?.role === 'Admin';
    const isSalesHead = (salesHeadCheck as any[])[0]?.user_id === req.user?.userId;

    if (!isAdmin && !isSalesHead) {
      return res
        .status(403)
        .json({ success: false, error: 'Admin or Sales Head access required' });
    }

    // Get the current sales_head_id for this product line
    const [headData] = await db.query(
      `SELECT user_id FROM user_product_lines
       WHERE product_line_id = ? AND is_sales_head = 1`,
      [productLineId]
    );

    const salesHeadId = (headData as any[])[0]?.user_id;

    if (!salesHeadId) {
      return res
        .status(400)
        .json({ success: false, error: 'No sales head assigned to this product line' });
    }

    // Start transaction
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Insert into sales_team_assignments
      await connection.query(
        `INSERT INTO sales_team_assignments
         (sales_head_id, team_member_id, product_line_id, is_active, assigned_at, assigned_by)
         VALUES (?, ?, ?, true, NOW(), ?)`,
        [salesHeadId, userId, productLineId, req.user?.userId]
      );

      // Ensure user is in user_product_lines for this product line
      const [existing] = await connection.query(
        'SELECT id FROM user_product_lines WHERE user_id = ? AND product_line_id = ?',
        [userId, productLineId]
      );

      if ((existing as any[]).length === 0) {
        await connection.query(
          'INSERT INTO user_product_lines (user_id, product_line_id, is_sales_head) VALUES (?, ?, 0)',
          [userId, productLineId]
        );
      }

      // Log to sales_team_history
      await connection.query(
        `INSERT INTO sales_team_history (action, user_id, product_line_id, performed_by, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        ['assigned', userId, productLineId, req.user?.userId]
      );

      await connection.commit();
      connection.release();

      // Fetch and return updated team
      const [updatedTeam] = await db.query(
        `
        SELECT
          pl.id,
          pl.name,
          upl.user_id as sales_head_id,
          u.full_name as sales_head_name,
          u.email as sales_head_email
        FROM product_lines pl
        LEFT JOIN user_product_lines upl ON pl.id = upl.product_line_id AND upl.is_sales_head = 1
        LEFT JOIN users u ON upl.user_id = u.id
        WHERE pl.id = ?
        `,
        [productLineId]
      );

      const productLine = (updatedTeam as any[])[0];

      const [members] = await db.query(
        `
        SELECT DISTINCT
          u.id,
          u.full_name,
          u.email,
          u.department
        FROM sales_team_assignments sta
        JOIN users u ON sta.team_member_id = u.id
        WHERE sta.product_line_id = ? AND sta.is_active = true
        `,
        [productLineId]
      );

      const teamData = {
        id: productLine.id,
        name: productLine.name,
        salesHead: productLine.sales_head_id
          ? {
              id: productLine.sales_head_id,
              fullName: productLine.sales_head_name,
              email: productLine.sales_head_email,
            }
          : null,
        members: (members as any[]).map((m) => ({
          id: m.id,
          fullName: m.full_name,
          email: m.email,
          department: m.department,
        })),
      };

      return res.json({ success: true, data: teamData });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    logger.error('Error adding team member:', error);
    return res.status(500).json({ success: false, error: 'Failed to add team member' });
  }
};

// DELETE /sales/team-structure/remove-member/:id
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Member ID is required' });
    }

    // Get the assignment to check authorization
    const [assignment] = await db.query(
      `SELECT product_line_id, team_member_id FROM sales_team_assignments WHERE id = ?`,
      [id]
    );

    if ((assignment as any[]).length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const { product_line_id, team_member_id } = (assignment as any[])[0];

    // Check authorization: Admin or Sales Head of this product line
    const [salesHeadCheck] = await db.query(
      `SELECT user_id FROM user_product_lines
       WHERE product_line_id = ? AND is_sales_head = 1`,
      [product_line_id]
    );

    const isAdmin = req.user?.role === 'Admin';
    const isSalesHead = (salesHeadCheck as any[])[0]?.user_id === req.user?.userId;

    if (!isAdmin && !isSalesHead) {
      return res
        .status(403)
        .json({ success: false, error: 'Admin or Sales Head access required' });
    }

    // Soft-delete
    await db.query(
      `UPDATE sales_team_assignments SET is_active = false, removed_at = NOW() WHERE id = ?`,
      [id]
    );

    // Log to sales_team_history
    await db.query(
      `INSERT INTO sales_team_history (action, user_id, product_line_id, performed_by, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      ['removed', team_member_id, product_line_id, req.user?.userId]
    );

    return res.json({ success: true, data: { message: 'Member removed successfully' } });
  } catch (error) {
    logger.error('Error removing team member:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove team member' });
  }
};

// POST /sales/team-structure/transfer
export const transferMember = async (req: Request, res: Response) => {
  try {
    const { userId, fromProductLineId, toProductLineId } = req.body;

    // Admin or Manager can transfer
    if (!['Admin', 'Manager'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin or Manager access required' });
    }

    if (!userId || !fromProductLineId || !toProductLineId) {
      return res.status(400).json({
        success: false,
        error: 'userId, fromProductLineId, and toProductLineId are required',
      });
    }

    // Start transaction
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Deactivate old assignment
      await connection.query(
        `UPDATE sales_team_assignments SET is_active = false, removed_at = NOW()
         WHERE team_member_id = ? AND product_line_id = ? AND is_active = true`,
        [userId, fromProductLineId]
      );

      // Get the sales head for the target product line
      const [targetHead] = await connection.query(
        `SELECT user_id FROM user_product_lines
         WHERE product_line_id = ? AND is_sales_head = 1`,
        [toProductLineId]
      );

      const targetSalesHeadId = (targetHead as any[])[0]?.user_id;

      if (!targetSalesHeadId) {
        throw new Error('No sales head assigned to target product line');
      }

      // Create new assignment in target product line
      await connection.query(
        `INSERT INTO sales_team_assignments
         (sales_head_id, team_member_id, product_line_id, is_active, assigned_at, assigned_by)
         VALUES (?, ?, ?, true, NOW(), ?)`,
        [targetSalesHeadId, userId, toProductLineId, req.user?.userId]
      );

      // Ensure user is in user_product_lines for target product line
      const [existing] = await connection.query(
        'SELECT id FROM user_product_lines WHERE user_id = ? AND product_line_id = ?',
        [userId, toProductLineId]
      );

      if ((existing as any[]).length === 0) {
        await connection.query(
          'INSERT INTO user_product_lines (user_id, product_line_id, is_sales_head) VALUES (?, ?, 0)',
          [userId, toProductLineId]
        );
      }

      // Log to sales_team_history
      await connection.query(
        `INSERT INTO sales_team_history
         (action, user_id, product_line_id, from_product_line_id, performed_by, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        ['transferred', userId, toProductLineId, fromProductLineId, req.user?.userId]
      );

      await connection.commit();
      connection.release();

      return res.json({ success: true, data: { message: 'Member transferred successfully' } });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    logger.error('Error transferring team member:', error);
    return res.status(500).json({ success: false, error: 'Failed to transfer team member' });
  }
};

// GET /sales/team-structure/history
export const getHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId;
    const productLineId = req.query.productLineId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    let query = `
      SELECT
        sth.id,
        sth.action,
        sth.user_id,
        u.full_name as user_name,
        sth.product_line_id,
        pl.name as product_line_name,
        sth.from_product_line_id,
        pl2.name as from_product_line_name,
        sth.performed_by,
        pu.full_name as performed_by_name,
        sth.notes,
        sth.created_at
      FROM sales_team_history sth
      LEFT JOIN users u ON sth.user_id = u.id
      LEFT JOIN product_lines pl ON sth.product_line_id = pl.id
      LEFT JOIN product_lines pl2 ON sth.from_product_line_id = pl2.id
      LEFT JOIN users pu ON sth.performed_by = pu.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (userId) {
      query += ' AND sth.user_id = ?';
      params.push(userId);
    }

    if (productLineId) {
      query += ' AND (sth.product_line_id = ? OR sth.from_product_line_id = ?)';
      params.push(productLineId, productLineId);
    }

    query += ' ORDER BY sth.created_at DESC LIMIT ?';
    params.push(limit);

    const [history] = await db.query(query, params);

    const formattedHistory = (history as any[]).map((h) => ({
      id: h.id,
      action: h.action,
      user: {
        id: h.user_id,
        fullName: h.user_name,
      },
      productLine: {
        id: h.product_line_id,
        name: h.product_line_name,
      },
      fromProductLine: h.from_product_line_id
        ? {
            id: h.from_product_line_id,
            name: h.from_product_line_name,
          }
        : null,
      performedBy: {
        id: h.performed_by,
        fullName: h.performed_by_name,
      },
      notes: h.notes,
      createdAt: h.created_at,
    }));

    return res.json({ success: true, data: formattedHistory });
  } catch (error) {
    logger.error('Error fetching history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
};
