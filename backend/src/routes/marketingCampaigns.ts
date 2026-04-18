import { Router } from 'express';
import { MarketingCampaignController } from '../controllers/marketingCampaignController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';
import { materialsUpload } from '../services/collateralFileService';

const router = Router();

// Apply authentication to all marketing campaign routes
router.use(authenticate);

// ==================== Dashboard ====================
router.get('/dashboard', MarketingCampaignController.getDashboardStats);

// ==================== AI ====================
router.post(
  '/ai-generate',
  validate({
    body: Joi.object({
      productName: Joi.string().min(1).max(255).required(),
      goal: Joi.string().min(1).max(500).required(),
      targetAudience: Joi.string().max(500).allow(null, ''),
      channels: Joi.array().items(Joi.string()).max(10).optional(),
    }),
  }),
  MarketingCampaignController.aiGenerateCampaign
);

router.post(
  '/ai-content',
  validate({
    body: Joi.object({
      channel: Joi.string().min(1).max(50),
      channel_type: Joi.string().min(1).max(50),
      topic: Joi.string().max(500).allow(null, ''),
      tone: Joi.string().max(50).allow(null, ''),
      context: Joi.string().max(2000).allow(null, ''),
      campaign_id: Joi.number().integer().positive().allow(null),
      campaign_name: Joi.string().max(500).allow(null, ''),
      campaign_description: Joi.string().max(2000).allow(null, ''),
    }).options({ allowUnknown: true }),
  }),
  MarketingCampaignController.aiGenerateContent
);

// ==================== Campaigns CRUD ====================
router.get('/', MarketingCampaignController.getAll);

router.post(
  '/',
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(2000).allow(null, ''),
      type: Joi.string().valid('email', 'social', 'multi-channel', 'content', 'event', 'other').optional(),
      status: Joi.string().valid('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled').optional(),
      target_audience_id: Joi.number().integer().positive().allow(null).optional(),
      budget: Joi.number().precision(2).min(0).allow(null).optional(),
      start_date: Joi.date().iso().allow(null).optional(),
      end_date: Joi.date().iso().allow(null).optional(),
      channels: Joi.array().items(Joi.object()).allow(null).optional(),
    }).options({ allowUnknown: true }),
  }),
  MarketingCampaignController.create
);

router.get(
  '/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  MarketingCampaignController.getById
);

router.put(
  '/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      name: Joi.string().min(1).max(255),
      description: Joi.string().max(2000).allow(null, ''),
      type: Joi.string().valid('email', 'social', 'multi-channel', 'content', 'event', 'other'),
      status: Joi.string().valid('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'),
      target_audience_id: Joi.number().integer().positive().allow(null),
      budget: Joi.number().precision(2).min(0).allow(null),
      start_date: Joi.date().iso().allow(null),
      end_date: Joi.date().iso().allow(null),
    }).options({ allowUnknown: true }),
  }),
  MarketingCampaignController.update
);

router.delete(
  '/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  MarketingCampaignController.delete
);

// ==================== Activate ====================
router.post(
  '/:id/activate',
  validate({ params: Joi.object({ id: schemas.id }) }),
  MarketingCampaignController.activateCampaign
);

// ==================== Channels ====================
router.post(
  '/:id/channels',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      channel_type: Joi.string().min(1).max(50),
      channel: Joi.string().min(1).max(50),
      content: Joi.string().max(10000).allow(null, ''),
      post_content: Joi.string().max(10000).allow(null, ''),
      subject: Joi.string().max(500).allow(null, ''),
      subject_line: Joi.string().max(500).allow(null, ''),
      scheduled_at: Joi.date().iso().allow(null).optional(),
      status: Joi.string().valid('draft', 'scheduled', 'published', 'failed').optional(),
    }).options({ allowUnknown: true }),
  }),
  MarketingCampaignController.addChannel
);

router.put(
  '/:id/channels/:channelId',
  validate({
    params: Joi.object({
      id: schemas.id,
      channelId: Joi.number().integer().positive().required(),
    }),
    body: Joi.object({
      channel_type: Joi.string().min(1).max(50),
      channel: Joi.string().min(1).max(50),
      content: Joi.string().max(10000).allow(null, ''),
      post_content: Joi.string().max(10000).allow(null, ''),
      subject: Joi.string().max(500).allow(null, ''),
      subject_line: Joi.string().max(500).allow(null, ''),
      scheduled_at: Joi.date().iso().allow(null),
      status: Joi.string().valid('draft', 'scheduled', 'published', 'failed'),
      engagement_metrics: Joi.object().allow(null),
    }).options({ allowUnknown: true }),
  }),
  MarketingCampaignController.updateChannel
);

router.delete(
  '/:id/channels/:channelId',
  validate({
    params: Joi.object({
      id: schemas.id,
      channelId: Joi.number().integer().positive().required(),
    }),
  }),
  MarketingCampaignController.removeChannel
);

// ==================== Channel Media ====================
router.post(
  '/:id/channels/:channelId/upload',
  materialsUpload.single('file'),
  MarketingCampaignController.uploadChannelMedia
);

router.post(
  '/:id/channels/:channelId/attach',
  validate({
    params: Joi.object({ id: schemas.id, channelId: Joi.number().integer().positive().required() }),
    body: Joi.object({ collateralIds: Joi.array().items(Joi.number().integer().positive()).min(1).required() }),
  }),
  MarketingCampaignController.attachCollateral
);

export default router;
