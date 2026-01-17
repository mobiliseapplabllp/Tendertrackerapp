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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

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

