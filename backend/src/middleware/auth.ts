import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { CustomError } from './errorHandler';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
        fullName?: string;
        productLineIds?: number[];
        isSalesHead?: boolean;
        salesHeadProductLineIds?: number[];
        teamMemberIds?: number[];
      };
    }
  }
}

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // Support token via query param (for media previews in <video>, <img>, <iframe>)
    const queryToken = req.query.token as string | undefined;

    if (!authHeader?.startsWith('Bearer ') && !queryToken) {
      throw new CustomError('No token provided', 401);
    }

    const token = queryToken || authHeader!.split(' ')[1];

    if (!token) {
      throw new CustomError('No token provided', 401);
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JWTPayload;

    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new CustomError('Invalid token payload', 401);
    }

    // Verify session exists and is valid
    const [sessions] = await db.query(
      'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > NOW() AND user_id = ?',
      [token, decoded.userId]
    );

    const sessionArray = sessions as any[];
    if (sessionArray.length === 0) {
      logger.warn({
        message: 'Invalid or expired session',
        userId: decoded.userId,
        ip: req.ip,
      });
      throw new CustomError('Invalid or expired session', 401);
    }

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    // Fetch user's full name
    try {
      const [userRows] = await db.query('SELECT full_name FROM users WHERE id = ?', [decoded.userId]);
      if ((userRows as any[]).length > 0) req.user.fullName = (userRows as any[])[0].full_name;
    } catch { /* skip */ }

    // Fetch user's assigned product line IDs for visibility filtering
    try {
      const [plRows] = await db.query(
        'SELECT product_line_id, is_sales_head FROM user_product_lines WHERE user_id = ?',
        [decoded.userId]
      );
      req.user.productLineIds = (plRows as any[]).map(r => r.product_line_id);

      // Determine if user is a sales head and for which product lines
      const headPLs = (plRows as any[]).filter(r => r.is_sales_head === 1 || r.is_sales_head === true);
      req.user.isSalesHead = headPLs.length > 0;
      req.user.salesHeadProductLineIds = headPLs.map(r => r.product_line_id);

      // If sales head, fetch team member IDs
      if (req.user.isSalesHead) {
        const [teamRows] = await db.query(
          'SELECT DISTINCT team_member_id FROM sales_team_assignments WHERE sales_head_id = ? AND is_active = TRUE',
          [decoded.userId]
        );
        req.user.teamMemberIds = (teamRows as any[]).map(r => r.team_member_id);
      } else {
        req.user.teamMemberIds = [];
      }
    } catch (plError: any) {
      // If table doesn't exist yet (pre-migration), silently skip
      req.user.productLineIds = [];
      req.user.isSalesHead = false;
      req.user.salesHeadProductLineIds = [];
      req.user.teamMemberIds = [];
    }

    next();
  } catch (error: any) {
    if (error instanceof CustomError) {
      return next(error);
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new CustomError('Invalid token', 401));
    }

    if (error.name === 'TokenExpiredError') {
      return next(new CustomError('Token expired', 401));
    }

    logger.error({
      message: 'Authentication error',
      error: error.message,
      stack: error.stack,
    });

    return next(new CustomError('Authentication failed', 401));
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Not authenticated', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn({
        message: 'Insufficient permissions',
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      return next(new CustomError('Insufficient permissions', 403));
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const [sessions] = await db.query(
      'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > NOW() AND user_id = ?',
      [token, decoded.userId]
    );

    const sessionArray = sessions as any[];
    if (sessionArray.length > 0) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

