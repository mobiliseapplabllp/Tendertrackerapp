import { Router } from 'express';
import { LeadTypeController } from '../controllers/leadTypeController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all lead types
router.get(
  '/',
  LeadTypeController.getAll
);

// Get lead type by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadTypeController.getById
);

// Create lead type (Admin only)
router.post(
  '/',
  authorize('Admin'),
  validate({
    body: Joi.object({
      name: Joi.string().required().max(100),
      description: Joi.string().allow(null, ''),
      icon: Joi.string().max(50).allow(null, ''),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, ''),
      displayOrder: Joi.number().integer().min(0).allow(null),
      isActive: Joi.boolean().allow(null),
    }),
  }),
  LeadTypeController.create
);

// Update lead type (Admin only)
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
      icon: Joi.string().max(50).allow(null, ''),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, ''),
      displayOrder: Joi.number().integer().min(0).allow(null),
      isActive: Joi.boolean().allow(null),
    }),
  }),
  LeadTypeController.update
);

// Delete lead type (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadTypeController.delete
);

export default router;


