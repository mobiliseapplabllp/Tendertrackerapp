import { Router } from 'express';
import { MarketingAnalyticsController } from '../controllers/marketingAnalyticsController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Apply authentication to all marketing analytics routes
router.use(authenticate);

// ==================== Analytics ====================
router.get('/overview', MarketingAnalyticsController.getOverview);

router.get(
  '/campaign/:campaignId',
  validate({
    params: Joi.object({
      campaignId: Joi.number().integer().positive().required(),
    }),
  }),
  MarketingAnalyticsController.getCampaignAnalytics
);

router.post(
  '/record',
  validate({
    body: Joi.object({
      campaign_id: Joi.number().integer().positive().allow(null).optional(),
      channel: Joi.string().max(50).allow(null, ''),
      metric_type: Joi.string().min(1).max(100).required(),
      metric_value: Joi.number().optional(),
    }).options({ allowUnknown: true }),
  }),
  MarketingAnalyticsController.recordMetric
);

export default router;
