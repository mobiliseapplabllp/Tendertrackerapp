import { Router } from 'express';
import { PipelineController } from '../controllers/pipelineController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get pipeline view
router.get(
  '/',
  validate({
    query: Joi.object({
      leadTypeId: schemas.id.optional(),
    }),
  }),
  PipelineController.getPipeline
);

// Get pipeline analytics
router.get(
  '/analytics',
  validate({
    query: Joi.object({
      leadTypeId: schemas.id.optional(),
      dateFrom: Joi.string().isoDate().optional(),
      dateTo: Joi.string().isoDate().optional(),
    }),
  }),
  PipelineController.getAnalytics
);

// Update stage order (Admin only)
router.put(
  '/stages/order',
  authorize('Admin'),
  validate({
    body: Joi.object({
      stages: Joi.array().items(
        Joi.object({
          id: schemas.id,
          stageOrder: Joi.number().integer().min(0).required(),
        })
      ).required(),
    }),
  }),
  PipelineController.updateStageOrder
);

export default router;


