import { Router } from 'express';
import { DealController } from '../controllers/dealController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all deals
router.get(
  '/',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().optional(),
      salesStageId: schemas.id.optional(),
      assignedTo: schemas.id.optional(),
      dateFrom: Joi.string().isoDate().optional(),
      dateTo: Joi.string().isoDate().optional(),
    }),
  }),
  DealController.getAll
);
// Get sales forecast
router.get(
  '/forecast',
  validate({
    query: Joi.object({
      period: Joi.string().valid('month', 'quarter', 'year').optional(),
      dateFrom: Joi.string().isoDate().optional(),
      dateTo: Joi.string().isoDate().optional(),
    }),
  }),
  DealController.getForecast
);

// Get deal by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  DealController.getById
);

// Create deal
router.post(
  '/',
  validate({
    body: Joi.object({
      leadId: schemas.id.required(),
      dealName: Joi.string().required().max(255),
      dealValue: Joi.number().positive().required(),
      currency: Joi.string().length(3).optional(),
      salesStageId: schemas.id.required(),
      probability: Joi.number().integer().min(0).max(100).optional(),
      expectedCloseDate: Joi.string().isoDate().optional(),
      assignedTo: schemas.id.optional(),
    }),
  }),
  DealController.create
);

// Update deal
router.put(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      dealName: Joi.string().max(255).optional(),
      dealValue: Joi.number().positive().optional(),
      currency: Joi.string().length(3).optional(),
      salesStageId: schemas.id.optional(),
      probability: Joi.number().integer().min(0).max(100).optional(),
      expectedCloseDate: Joi.string().isoDate().optional(),
      assignedTo: schemas.id.optional(),
    }),
  }),
  DealController.update
);

// Delete deal
router.delete(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  DealController.delete
);



export default router;

