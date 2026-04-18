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

// ==================== Sharing ====================
router.post(
  '/share/create-link',
  validate({
    body: Joi.object({
      collateralId: Joi.number().integer().positive().required(),
      expiresInDays: Joi.number().integer().positive().allow(null).optional(),
    }),
  }),
  CollateralController.createPublicLink
);

router.post(
  '/share/log',
  validate({
    body: Joi.object({
      collateralId: Joi.number().integer().positive().required(),
      channel: Joi.string().valid('email', 'whatsapp', 'sms', 'linkedin', 'twitter', 'facebook', 'copy_link', 'other').required(),
      recipientInfo: Joi.string().max(500).allow(null, '').optional(),
      shareToken: Joi.string().max(64).allow(null, '').optional(),
      sentAsAttachment: Joi.boolean().optional(),
    }),
  }),
  CollateralController.logShare
);

router.post(
  '/share/ai-email-draft',
  validate({
    body: Joi.object({
      collateralId: Joi.number().integer().positive().required(),
    }),
  }),
  CollateralController.aiGenerateShareEmailDraft
);

router.get(
  '/share/same-product-line/:collateralId',
  validate({ params: Joi.object({ collateralId: Joi.number().integer().positive().required() }) }),
  CollateralController.getSameProductLineItems
);

router.post(
  '/share/send-email',
  validate({
    body: Joi.object({
      collateralId: Joi.number().integer().positive().required(),
      to: Joi.string().email().required(),
      cc: Joi.string().allow(null, '').optional(),
      subject: Joi.string().min(1).max(500).required(),
      body: Joi.string().min(1).required(),
      attachFile: Joi.boolean().optional(),
      additionalCollateralIds: Joi.array().items(Joi.number().integer().positive()).max(10).optional(),
    }),
  }),
  CollateralController.sendShareEmail
);

router.get(
  '/share/history/:collateralId',
  validate({ params: Joi.object({ collateralId: Joi.number().integer().positive().required() }) }),
  CollateralController.getShareHistory
);

router.get(
  '/share/links/:collateralId',
  validate({ params: Joi.object({ collateralId: Joi.number().integer().positive().required() }) }),
  CollateralController.getPublicLink
);

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
      productLineId: Joi.number().integer().positive().allow(null).optional(),
      productId: Joi.number().integer().positive().allow(null).optional(),
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
      productLineId: Joi.number().integer().positive().allow(null).optional(),
      productId: Joi.number().integer().positive().allow(null).optional(),
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
