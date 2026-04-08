import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';
import {
  getTemplates, getByLead, getById, create, update, deleteProposal,
  submitForApproval, approve, reject, markSubmitted, updateOutcome,
  getLineItems, addLineItem, updateLineItem, removeLineItem, addBundleToProposal,
  getVersions
} from '../controllers/proposalController';

const router = Router();
router.use(authenticate);

// Templates
router.get('/templates', getTemplates);

// Proposals by lead
router.get('/lead/:leadId', validate({ params: Joi.object({ leadId: schemas.id }) }), getByLead);

// Proposal CRUD
router.get('/:id', validate({ params: Joi.object({ id: schemas.id }) }), getById);
router.post('/', validate({
  body: Joi.object({
    tenderId: Joi.number().integer().positive().required(),
    templateId: Joi.number().integer().positive().allow(null),
    title: Joi.string().required(),
    description: Joi.string().allow(null, ''),
    proposalType: Joi.string().valid('Software', 'Hardware', 'Custom Development', 'Other'),
    coverLetter: Joi.string().allow(null, ''),
    executiveSummary: Joi.string().allow(null, ''),
    scopeOfWork: Joi.string().allow(null, ''),
    termsConditions: Joi.string().allow(null, ''),
    paymentTerms: Joi.string().allow(null, ''),
    warrantyTerms: Joi.string().allow(null, ''),
    validityPeriodDays: Joi.number().integer().min(1).max(365),
    currency: Joi.string().length(3),
  })
}), create);
router.put('/:id', validate({ params: Joi.object({ id: schemas.id }) }), update);
router.delete('/:id', validate({ params: Joi.object({ id: schemas.id }) }), deleteProposal);

// Workflow
router.post('/:id/submit-for-approval', validate({ params: Joi.object({ id: schemas.id }) }), submitForApproval);
router.post('/:id/approve', validate({ params: Joi.object({ id: schemas.id }) }), approve);
router.post('/:id/reject', validate({
  params: Joi.object({ id: schemas.id }),
  body: Joi.object({ reason: Joi.string().allow(null, '') })
}), reject);
router.post('/:id/mark-submitted', validate({
  params: Joi.object({ id: schemas.id }),
  body: Joi.object({ submittedTo: Joi.string().required(), submittedToEmail: Joi.string().email().allow(null, '') })
}), markSubmitted);
router.post('/:id/outcome', validate({
  params: Joi.object({ id: schemas.id }),
  body: Joi.object({ status: Joi.string().valid('Accepted', 'Rejected').required() })
}), updateOutcome);

// Line items
router.get('/:proposalId/line-items', validate({ params: Joi.object({ proposalId: schemas.id }) }), getLineItems);
router.post('/:proposalId/line-items', validate({
  params: Joi.object({ proposalId: schemas.id }),
  body: Joi.object({
    productId: Joi.number().integer().positive().allow(null),
    parentLineItemId: Joi.number().integer().positive().allow(null),
    itemName: Joi.string().required(),
    itemDescription: Joi.string().allow(null, ''),
    itemType: Joi.string().valid('Product', 'Bundle', 'Component', 'Service', 'Custom'),
    sku: Joi.string().allow(null, ''),
    hsnCode: Joi.string().allow(null, ''),
    unitOfMeasure: Joi.string(),
    quantity: Joi.number().min(0.01),
    unitPrice: Joi.number().min(0),
    taxRate: Joi.number().min(0).max(100),
    discountPercent: Joi.number().min(0).max(100),
    displayOrder: Joi.number().integer(),
    notes: Joi.string().allow(null, ''),
  })
}), addLineItem);
router.put('/:proposalId/line-items/:itemId', validate({
  params: Joi.object({ proposalId: schemas.id, itemId: schemas.id })
}), updateLineItem);
router.delete('/:proposalId/line-items/:itemId', validate({
  params: Joi.object({ proposalId: schemas.id, itemId: schemas.id })
}), removeLineItem);

// Bundle
router.post('/:proposalId/add-bundle', validate({
  params: Joi.object({ proposalId: schemas.id }),
  body: Joi.object({ productId: Joi.number().integer().positive().required(), quantity: Joi.number().min(1) })
}), addBundleToProposal);

// Versions
router.get('/:proposalId/versions', validate({ params: Joi.object({ proposalId: schemas.id }) }), getVersions);

export default router;
