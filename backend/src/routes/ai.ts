import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require Admin authentication
router.use(authenticate);
router.use(authorize('Admin'));

// Get all AI API configurations (Admin only)
router.get(
  '/',
  AIController.getAll
);

// Get a single AI API configuration (Admin only)
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  AIController.getById
);

// Create a new AI API configuration (Admin only)
router.post(
  '/',
  validate({
    body: Joi.object({
      providerName: Joi.string().required(),
      modelName: Joi.string().required(),
      apiKey: Joi.string().required(),
      baseUrl: Joi.string().uri().allow('').optional(),
      isActive: Joi.boolean().optional(),
      isDefault: Joi.boolean().optional(),
      maxTokens: Joi.number().integer().min(1).max(100000).optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      description: Joi.string().allow('').optional(),
    }),
  }),
  AIController.create
);

// Update an AI API configuration (Admin only)
router.put(
  '/:id',
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
    body: Joi.object({
      providerName: Joi.string().optional(),
      modelName: Joi.string().optional(),
      apiKey: Joi.string().optional(),
      baseUrl: Joi.string().uri().allow('').optional(),
      isActive: Joi.boolean().optional(),
      isDefault: Joi.boolean().optional(),
      maxTokens: Joi.number().integer().min(1).max(100000).optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      description: Joi.string().allow('').optional(),
    }),
  }),
  AIController.update
);

// Delete an AI API configuration (Admin only)
router.delete(
  '/:id',
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  AIController.delete
);

// Test an AI API configuration (Admin only)
router.post(
  '/:id/test',
  validate({
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
  }),
  AIController.test
);

export default router;



