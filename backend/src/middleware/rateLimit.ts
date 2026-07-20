import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

// General API rate limiter
// Decodes JWT (without DB call) to get user ID for per-user bucketing.
// Falls back to IP for unauthenticated requests.
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'), // 500 requests per user per minute
  keyGenerator: (req) => {
    // Decode JWT to get user ID — no DB call, just reads the token payload
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.decode(token) as { userId?: number } | null;
        if (decoded?.userId) return `user_${decoded.userId}`;
      } catch {
        // Invalid token — fall through to IP
      }
    }
    // Unauthenticated: fall back to IP
    return req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded',
      ip: req.ip,
      userId: (req as unknown as { user?: { userId: number } }).user?.userId,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
    });
  },
});

// Stricter rate limiter for login endpoints
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5'), // 5 login attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn({
      message: 'Login rate limit exceeded',
      ip: req.ip,
      email: req.body?.email,
    });
    res.status(429).json({
      success: false,
      error: 'Too many login attempts, please try again after a minute.',
    });
  },
});

// Rate limiter for OTP requests
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTP requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'OTP rate limit exceeded',
      ip: req.ip,
      email: req.body?.email,
    });
    res.status(429).json({
      success: false,
      error: 'Too many OTP requests, please try again after a minute.',
    });
  },
});
