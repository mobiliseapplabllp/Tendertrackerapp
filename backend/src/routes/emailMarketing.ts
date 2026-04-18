import { Router } from 'express';
import { EmailMarketingController } from '../controllers/emailMarketingController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Apply authentication to all email marketing routes
router.use(authenticate);

// ==================== AI ====================
router.post(
  '/ai-generate',
  validate({
    body: Joi.object({
      subject: Joi.string().min(1).max(500).allow(null, ''),
      topic: Joi.string().min(1).max(500).allow(null, ''),
      context: Joi.string().max(2000).allow(null, ''),
      tone: Joi.string().max(50).allow(null, ''),
    }).options({ allowUnknown: true }),
  }),
  EmailMarketingController.aiGenerateEmail
);

// ==================== Lists ====================
router.get('/lists', EmailMarketingController.getLists);

router.post(
  '/lists',
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(1000).allow(null, ''),
    }).options({ allowUnknown: true }),
  }),
  EmailMarketingController.createList
);

router.put(
  '/lists/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      name: Joi.string().min(1).max(255),
      description: Joi.string().max(1000).allow(null, ''),
    }).options({ allowUnknown: true }),
  }),
  EmailMarketingController.updateList
);

router.delete(
  '/lists/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  EmailMarketingController.deleteList
);

// ==================== Members ====================
router.get(
  '/lists/:id/members',
  validate({ params: Joi.object({ id: schemas.id }) }),
  EmailMarketingController.getListMembers
);

router.post(
  '/lists/:id/members',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      emails: Joi.array().items(Joi.string().email()).min(1).max(1000).required(),
      name: Joi.string().max(255).allow(null, ''),
      company: Joi.string().max(255).allow(null, ''),
    }).options({ allowUnknown: true }),
  }),
  EmailMarketingController.addMembers
);

router.delete(
  '/lists/:id/members/:memberId',
  validate({
    params: Joi.object({
      id: schemas.id,
      memberId: Joi.number().integer().positive().required(),
    }),
  }),
  EmailMarketingController.removeMember
);

// ==================== Email Campaigns ====================
router.get('/campaigns', EmailMarketingController.getEmailCampaigns);

router.post(
  '/campaigns',
  validate({
    body: Joi.object({
      subject: Joi.string().min(1).max(500).required(),
      body: Joi.string().min(1).required(),
      list_id: Joi.number().integer().positive().allow(null).optional(),
      campaign_id: Joi.number().integer().positive().allow(null).optional(),
      from_name: Joi.string().max(255).allow(null, ''),
      scheduled_at: Joi.date().iso().allow(null).optional(),
      status: Joi.string().valid('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled').optional(),
    }).options({ allowUnknown: true }),
  }),
  EmailMarketingController.createEmailCampaign
);

router.put(
  '/campaigns/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      subject: Joi.string().min(1).max(500),
      body: Joi.string().min(1),
      list_id: Joi.number().integer().positive().allow(null),
      campaign_id: Joi.number().integer().positive().allow(null),
      from_name: Joi.string().max(255).allow(null, ''),
      scheduled_at: Joi.date().iso().allow(null),
      status: Joi.string().valid('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'),
    }).options({ allowUnknown: true }),
  }),
  EmailMarketingController.updateEmailCampaign
);

router.post(
  '/campaigns/:id/send',
  validate({ params: Joi.object({ id: schemas.id }) }),
  EmailMarketingController.sendEmailCampaign
);

export default router;
