import { Router } from 'express';
import { TagController } from '../controllers/tagController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';
import { schemas } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all tags
router.get('/', TagController.getAll);

// Get tag by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TagController.getById
);

// Create tag
router.post(
  '/',
  validate({
    body: Joi.object({
      name: Joi.string().required().min(1).max(50),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, ''),
    }),
  }),
  TagController.create
);

// Update tag
router.put(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      name: Joi.string().min(1).max(50),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, ''),
    }),
  }),
  TagController.update
);

// Delete tag
router.delete(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TagController.delete
);

export default router;

