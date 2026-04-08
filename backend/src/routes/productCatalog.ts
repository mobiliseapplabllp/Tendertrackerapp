import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getBOM, addBOMComponent, updateBOMComponent, removeBOMComponent
} from '../controllers/productCatalogController';

const router = Router();
router.use(authenticate);

// ==================== Categories ====================
router.get('/categories', getCategories);
router.post('/categories', validate({
  body: Joi.object({ name: Joi.string().required(), description: Joi.string().allow(null, ''), parentId: Joi.number().integer().allow(null), icon: Joi.string().allow(null, ''), displayOrder: Joi.number().integer() })
}), createCategory);
router.put('/categories/:id', validate({ params: Joi.object({ id: schemas.id }) }), updateCategory);
router.delete('/categories/:id', validate({ params: Joi.object({ id: schemas.id }) }), deleteCategory);

// ==================== Products ====================
router.get('/', getProducts);
router.get('/:id', validate({ params: Joi.object({ id: schemas.id }) }), getProductById);
router.post('/', validate({
  body: Joi.object({
    sku: Joi.string().max(50).allow(null, ''),
    name: Joi.string().required(),
    description: Joi.string().allow(null, ''),
    categoryId: Joi.number().integer().positive().required(),
    productLineId: Joi.number().integer().positive().allow(null),
    subCategory: Joi.string().valid('Software', 'Hardware', 'Service', 'Consumable').required(),
    unitPrice: Joi.number().min(0).required(),
    currency: Joi.string().length(3),
    unitOfMeasure: Joi.string().max(50),
    taxRate: Joi.number().min(0).max(100),
    hsnCode: Joi.string().max(20).allow(null, ''),
    isStandalone: Joi.boolean(),
    isBundle: Joi.boolean(),
    imageUrl: Joi.string().uri().allow(null, ''),
    tags: Joi.array().items(Joi.string()),
  })
}), createProduct);
router.put('/:id', validate({ params: Joi.object({ id: schemas.id }) }), updateProduct);
router.delete('/:id', validate({ params: Joi.object({ id: schemas.id }) }), deleteProduct);

// ==================== BOM ====================
router.get('/:id/bom', validate({ params: Joi.object({ id: schemas.id }) }), getBOM);
router.post('/:id/bom', validate({
  params: Joi.object({ id: schemas.id }),
  body: Joi.object({
    componentProductId: Joi.number().integer().positive().required(),
    quantity: Joi.number().min(0.01),
    isOptional: Joi.boolean(),
    displayOrder: Joi.number().integer(),
    notes: Joi.string().max(255).allow(null, ''),
  })
}), addBOMComponent);
router.put('/:id/bom/:bomId', validate({ params: Joi.object({ id: schemas.id, bomId: schemas.id }) }), updateBOMComponent);
router.delete('/:id/bom/:bomId', validate({ params: Joi.object({ id: schemas.id, bomId: schemas.id }) }), removeBOMComponent);

export default router;
