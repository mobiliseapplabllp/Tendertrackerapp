import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded',
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Stricter rate limiter for login endpoints
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5'), // 5 login attempts per minute
  message: {
    success: false,
    error: 'Too many login attempts, please try again after a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
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
  message: {
    success: false,
    error: 'Too many OTP requests, please try again after a minute.',
  },
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

