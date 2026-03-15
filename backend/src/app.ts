import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import logger from './utils/logger';
import db from './config/database';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tenderRoutes from './routes/tenders'; // Legacy - keep for backward compatibility
import leadRoutes from './routes/leads'; // New CRM routes
import companyRoutes from './routes/companies';
import documentRoutes from './routes/documents';
import reportRoutes from './routes/reports';
import adminRoutes from './routes/admin';
import categoryRoutes from './routes/categories';
import tagRoutes from './routes/tags';
import reminderRoutes from './routes/reminders';
import leadTypeRoutes from './routes/leadTypes';
import salesStageRoutes from './routes/salesStages';
import pipelineRoutes from './routes/pipeline';
import activityRoutes from './routes/activities';
import dealRoutes from './routes/deals';
import aiRoutes from './routes/ai';
import tenderScoutRoutes from './routes/tenderScout';
import configurationRoutes from './routes/configurationRoutes';
import productLineRoutes from './routes/productLines';
import { ReminderService } from './services/reminderService';

const app: Express = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Trust proxy for production environments behind Apache/Nginx
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' needed for Tailwind CSS
      scriptSrc: ["'self'"], // Remove 'unsafe-inline' and 'unsafe-eval' for production
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (origin && corsOrigins.includes(origin)) {
      callback(null, true);
    } else if (origin) {
      logger.warn({ message: 'CORS blocked origin', origin });
      callback(new Error('Not allowed by CORS'));
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use((req, _res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint (before rate limiting)
app.get('/health', async (_req, res) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1 as health');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// API rate limiting
app.use(`/api/${API_VERSION}`, apiLimiter);

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
// Support both /tenders (legacy) and /leads (new) during migration
app.use(`/api/${API_VERSION}/tenders`, tenderRoutes);
app.use(`/api/${API_VERSION}/leads`, leadRoutes);
app.use(`/api/${API_VERSION}/companies`, companyRoutes);
app.use(`/api/${API_VERSION}/reminders`, reminderRoutes);
app.use(`/api/${API_VERSION}/documents`, documentRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/tags`, tagRoutes);
app.use(`/api/${API_VERSION}/lead-types`, leadTypeRoutes);
app.use(`/api/${API_VERSION}/sales-stages`, salesStageRoutes);
app.use(`/api/${API_VERSION}/pipeline`, pipelineRoutes);
app.use(`/api/${API_VERSION}/activities`, activityRoutes);
app.use(`/api/${API_VERSION}/deals`, dealRoutes);
app.use(`/api/${API_VERSION}/ai`, aiRoutes);
app.use(`/api/${API_VERSION}/tender-scout`, tenderScoutRoutes);
app.use(`/api/${API_VERSION}/configuration`, configurationRoutes);
app.use(`/api/${API_VERSION}/product-lines`, productLineRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info({
    message: `🚀 Server running on port ${PORT}`,
    environment: process.env.NODE_ENV || 'development',
    apiVersion: API_VERSION,
  });

  if (!process.env.AI_API_ENCRYPTION_KEY) {
    logger.warn('⚠️  AI_API_ENCRYPTION_KEY is not set. API keys will be encrypted with a random key and will be lost on restart.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Schedule reminder sending (every hour)
if (process.env.NODE_ENV !== 'test') {
  // Send reminders immediately on startup (for testing)
  setTimeout(() => {
    ReminderService.sendReminders().catch((error) => {
      logger.error({
        message: 'Error in initial reminder send',
        error: error.message,
      });
    });
  }, 30000); // Wait 30 seconds after server starts

  // Then send reminders every hour
  setInterval(() => {
    ReminderService.sendReminders().catch((error) => {
      logger.error({
        message: 'Error in scheduled reminder send',
        error: error.message,
      });
    });
  }, 60 * 60 * 1000); // Every hour

  logger.info('Reminder service scheduled to run every hour');
}

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;

