import { Router } from 'express';
import { DocumentController } from '../controllers/documentController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { upload } from '../services/fileService';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

router.get('/', DocumentController.getAll);
router.get('/categories', DocumentController.getCategories);
router.post(
  '/categories',
  validate({
    body: Joi.object({
      name: Joi.string().required().trim().min(1).max(100),
      description: Joi.string().allow(null, '').max(500),
      icon: Joi.string().allow(null, '').max(50),
    }),
  }),
  DocumentController.createCategory
);
router.put(
  '/categories/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      name: Joi.string().trim().min(1).max(100),
      description: Joi.string().allow(null, '').max(500),
      icon: Joi.string().allow(null, '').max(50),
    }),
  }),
  DocumentController.updateCategory
);
router.delete(
  '/categories/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  DocumentController.deleteCategory
);
router.get('/:id', validate({ params: Joi.object({ id: schemas.id }) }), DocumentController.getById);
router.get('/:id/view', validate({ params: Joi.object({ id: schemas.id }) }), DocumentController.view);
router.get('/:id/download', validate({ params: Joi.object({ id: schemas.id }) }), DocumentController.download);
router.post(
  '/',
  upload.single('file'),
  validate({
    body: Joi.object({
      tenderId: Joi.number().integer().positive().allow(null),
      categoryId: Joi.number().integer().positive().allow(null),
      expirationDate: Joi.date().allow(null),
    }),
  }),
  DocumentController.upload
);
router.put(
  '/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      name: Joi.string().allow(null, ''),
      description: Joi.string().allow(null, ''),
      categoryId: Joi.number().integer().positive().allow(null),
      expirationDate: Joi.date().allow(null, ''),
    }),
  }),
  DocumentController.update
);
router.put(
  '/:id/favorite',
  validate({ params: Joi.object({ id: schemas.id }) }),
  DocumentController.toggleFavorite
);
router.delete('/:id', validate({ params: Joi.object({ id: schemas.id }) }), DocumentController.delete);

export default router;

