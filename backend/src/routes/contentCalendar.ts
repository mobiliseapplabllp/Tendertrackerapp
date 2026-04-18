import { Router } from 'express';
import { ContentCalendarController } from '../controllers/contentCalendarController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Apply authentication to all content calendar routes
router.use(authenticate);

// ==================== AI ====================
router.post(
  '/ai-suggest',
  validate({
    body: Joi.object({
      contentTypes: Joi.array().items(Joi.string()).max(20).optional(),
      channels: Joi.array().items(Joi.string()).max(20).optional(),
      startDate: Joi.string().required(),
      endDate: Joi.string().required(),
    }).options({ allowUnknown: true }),
  }),
  ContentCalendarController.aiSuggestSchedule
);

// ==================== Events CRUD ====================
router.get('/', ContentCalendarController.getEvents);

router.post(
  '/',
  validate({
    body: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(2000).allow(null, ''),
      content_type: Joi.string().valid('social_post', 'email', 'blog', 'event', 'other').allow(null, ''),
      channel: Joi.string().max(50).allow(null, ''),
      scheduled_date: Joi.string().required(),
      scheduled_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).allow(null, ''),
      status: Joi.string().valid('idea', 'draft', 'planned', 'in_progress', 'scheduled', 'published', 'cancelled').optional(),
      campaign_id: Joi.number().integer().positive().allow(null).optional(),
      content: Joi.string().max(10000).allow(null, ''),
      color: Joi.string().max(20).allow(null, ''),
      ai_generated: Joi.boolean().optional(),
    }).options({ allowUnknown: true }),
  }),
  ContentCalendarController.createEvent
);

router.put(
  '/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      title: Joi.string().min(1).max(255),
      description: Joi.string().max(2000).allow(null, ''),
      content_type: Joi.string().valid('social_post', 'email', 'blog', 'event', 'other').allow(null, ''),
      channel: Joi.string().max(50).allow(null, ''),
      scheduled_date: Joi.string(),
      scheduled_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).allow(null, ''),
      status: Joi.string().valid('idea', 'draft', 'planned', 'in_progress', 'scheduled', 'published', 'cancelled'),
      campaign_id: Joi.number().integer().positive().allow(null),
      content: Joi.string().max(10000).allow(null, ''),
      color: Joi.string().max(20).allow(null, ''),
      ai_generated: Joi.boolean(),
    }).options({ allowUnknown: true }),
  }),
  ContentCalendarController.updateEvent
);

router.delete(
  '/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  ContentCalendarController.deleteEvent
);

export default router;
