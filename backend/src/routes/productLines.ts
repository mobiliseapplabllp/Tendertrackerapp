import { Router } from 'express';
import { ProductLineController } from '../controllers/productLineController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all product lines (all authenticated users - for dropdowns)
router.get('/', ProductLineController.getAll);

// Get product line by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
  }),
  ProductLineController.getById
);

// Get product lines for a specific user
router.get(
  '/user/:userId',
  validate({
    params: Joi.object({ userId: schemas.id }),
  }),
  ProductLineController.getUserProductLines
);

// Create product line (Admin/Manager only)
router.post(
  '/',
  authorize('Admin', 'Manager'),
  validate({
    body: Joi.object({
      name: Joi.string().required().max(100),
      description: Joi.string().optional().max(255).allow('', null),
      displayOrder: Joi.number().integer().optional(),
    }),
  }),
  ProductLineController.create
);

// Update product line (Admin/Manager only)
router.put(
  '/:id',
  authorize('Admin', 'Manager'),
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      name: Joi.string().optional().max(100),
      description: Joi.string().optional().max(255).allow('', null),
      isActive: Joi.boolean().optional(),
      displayOrder: Joi.number().integer().optional(),
    }),
  }),
  ProductLineController.update
);

// Delete product line (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({ id: schemas.id }),
  }),
  ProductLineController.delete
);

export default router;
