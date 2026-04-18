import { Router } from 'express';
import { AudienceSegmentController } from '../controllers/audienceSegmentController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Apply authentication to all audience segment routes
router.use(authenticate);

// ==================== AI ====================
router.post('/ai-suggest', AudienceSegmentController.aiSuggestSegments);

// ==================== Segments CRUD ====================
router.get('/', AudienceSegmentController.getAll);

router.post(
  '/',
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(1000).allow(null, ''),
      criteria: Joi.object().allow(null).optional(),
      contact_count: Joi.number().integer().min(0).optional(),
      is_dynamic: Joi.boolean().optional(),
    }).options({ allowUnknown: true }),
  }),
  AudienceSegmentController.create
);

router.get(
  '/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  AudienceSegmentController.getById
);

router.put(
  '/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      name: Joi.string().min(1).max(255),
      description: Joi.string().max(1000).allow(null, ''),
      criteria: Joi.object().allow(null),
      contact_count: Joi.number().integer().min(0),
      is_dynamic: Joi.boolean(),
    }).options({ allowUnknown: true }),
  }),
  AudienceSegmentController.update
);

router.delete(
  '/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  AudienceSegmentController.delete
);

router.post(
  '/:id/refresh',
  validate({ params: Joi.object({ id: schemas.id }) }),
  AudienceSegmentController.refreshCount
);

export default router;
