import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';
import { schemas } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all categories
router.get('/', CategoryController.getAll);

// Get category by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  CategoryController.getById
);

// Create category
router.post(
  '/',
  validate({
    body: Joi.object({
      name: Joi.string().required().min(1).max(100),
      description: Joi.string().allow(null, '').max(500),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, ''),
      icon: Joi.string().allow(null, '').max(50),
    }),
  }),
  CategoryController.create
);

// Update category
router.put(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      name: Joi.string().min(1).max(100),
      description: Joi.string().allow(null, '').max(500),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, ''),
      icon: Joi.string().allow(null, '').max(50),
      isActive: Joi.boolean(),
    }),
  }),
  CategoryController.update
);

// Delete category
router.delete(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  CategoryController.delete
);

export default router;

