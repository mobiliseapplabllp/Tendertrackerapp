import { Router } from 'express';
import { getTargets, createTarget, distributeTarget, updateTarget, bulkSetTargets, copyPeriodTargets, getTargetSummary } from '../controllers/salesTargetController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

// Get targets (with filters)
router.get('/', getTargets);

// Get target summary/dashboard
router.get('/summary', getTargetSummary);

// Create target
router.post(
  '/',
  validate({
    body: Joi.object({
      userId: Joi.number().integer().positive().required(),
      productLineId: Joi.number().integer().positive().required(),
      subCategory: Joi.string().valid('Software', 'Hardware', 'All').optional(),
      periodType: Joi.string().valid('quarterly', 'yearly').required(),
      periodYear: Joi.number().integer().min(2020).max(2030).required(),
      periodQuarter: Joi.number().integer().min(1).max(4).allow(null),
      targetValue: Joi.number().positive().required(),
      targetDeals: Joi.number().integer().positive().allow(null),
    }),
  }),
  createTarget
);

// Distribute target across team
router.post('/distribute', distributeTarget);

// Bulk set targets
router.post('/bulk', bulkSetTargets);

// Copy targets from another period
router.post('/copy', copyPeriodTargets);

// Update target
router.put(
  '/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      targetValue: Joi.number().positive(),
      targetDeals: Joi.number().integer().positive().allow(null),
      status: Joi.string().valid('Draft', 'Active', 'Closed'),
    }),
  }),
  updateTarget
);

export default router;
