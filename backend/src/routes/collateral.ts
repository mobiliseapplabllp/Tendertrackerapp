import { Router } from 'express';
import { CollateralController } from '../controllers/collateralController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { materialsUpload } from '../services/collateralFileService';
import Joi from 'joi';

const router = Router();

// Apply authentication to all collateral routes
router.use(authenticate);

// ==================== Dashboard Stats ====================
router.get('/dashboard', CollateralController.getDashboardStats);

// ==================== Categories ====================
router.get('/categories', CollateralController.getCategories);

router.post(
  '/categories',
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      description: Joi.string().max(500).allow(null, ''),
      icon: Joi.string().max(50).allow(null, ''),
    }),
  }),
  CollateralController.createCategory
);

// ==================== Tags ====================
router.get('/tags', CollateralController.getTags);

router.post(
  '/tags',
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      tagType: Joi.string().valid('project', 'product', 'general').required(),
    }),
  }),
  CollateralController.createTag
);

router.delete(
  '/tags/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  CollateralController.deleteTag
);

// ==================== Search ====================
router.get('/search', CollateralController.search);

// ==================== Collateral Items ====================
router.get('/', CollateralController.getAll);

router.get(
  '/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  CollateralController.getById
);

router.get(
  '/:id/download',
  validate({ params: Joi.object({ id: schemas.id }) }),
  CollateralController.download
);

router.get(
  '/:id/versions',
  validate({ params: Joi.object({ id: schemas.id }) }),
  CollateralController.getVersions
);

router.post(
  '/',
  materialsUpload.single('file'),
  validate({
    body: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(2000).allow(null, ''),
      categoryId: Joi.number().integer().positive().required(),
      tags: Joi.string().allow(null, ''), // Comma-separated tag IDs
      isFeatured: Joi.any().optional(),
    }),
  }),
  CollateralController.upload
);

router.put(
  '/:id',
  materialsUpload.single('file'),
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      title: Joi.string().min(1).max(255),
      description: Joi.string().max(2000).allow(null, ''),
      categoryId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/)),
      tags: Joi.alternatives().try(
        Joi.string().allow(null, ''),
        Joi.array().items(Joi.number())
      ),
      isFeatured: Joi.any().optional(),
    }),
  }),
  CollateralController.update
);

router.delete(
  '/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  CollateralController.delete
);

export default router;
