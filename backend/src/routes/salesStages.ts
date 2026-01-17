import { Router } from 'express';
import { SalesStageController } from '../controllers/salesStageController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all sales stages
router.get(
  '/',
  SalesStageController.getAll
);

// Get sales stage by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  SalesStageController.getById
);

// Create sales stage (Admin only)
router.post(
  '/',
  authorize('Admin'),
  validate({
    body: Joi.object({
      name: Joi.string().required().max(100),
      description: Joi.string().allow(null, ''),
      probability: Joi.number().integer().min(0).max(100).allow(null),
      stageOrder: Joi.number().integer().min(0).allow(null),
      isActive: Joi.boolean().allow(null),
    }),
  }),
  SalesStageController.create
);

// Update sales stage (Admin only)
router.put(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      name: Joi.string().max(100),
      description: Joi.string().allow(null, ''),
      probability: Joi.number().integer().min(0).max(100).allow(null),
      stageOrder: Joi.number().integer().min(0).allow(null),
      isActive: Joi.boolean().allow(null),
    }),
  }),
  SalesStageController.update
);

// Delete sales stage (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  SalesStageController.delete
);

export default router;


