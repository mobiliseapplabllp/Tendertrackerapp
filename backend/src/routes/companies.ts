import { Router } from 'express';
import { CompanyController } from '../controllers/companyController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

router.get('/', CompanyController.getAll);
router.get('/:id', validate({ params: Joi.object({ id: schemas.id }) }), CompanyController.getById);
router.post(
  '/',
  validate({
    body: Joi.object({
      companyName: Joi.string().required(),
      industry: Joi.string().allow(null, ''),
      website: Joi.string().uri().allow(null, ''),
      phone: Joi.string().max(20).allow(null, ''),
      email: Joi.string().email().allow(null, ''),
      address: Joi.string().allow(null, ''),
      city: Joi.string().max(100).allow(null, ''),
      state: Joi.string().max(100).allow(null, ''),
      country: Joi.string().max(100).allow(null, ''),
      postalCode: Joi.string().max(20).allow(null, ''),
      taxId: Joi.string().max(50).allow(null, ''),
    }),
  }),
  CompanyController.create
);
router.put(
  '/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      companyName: Joi.string(),
      industry: Joi.string().allow(null, ''),
      website: Joi.string().uri().allow(null, ''),
      phone: Joi.string().max(20).allow(null, ''),
      email: Joi.string().email().allow(null, ''),
      address: Joi.string().allow(null, ''),
      city: Joi.string().max(100).allow(null, ''),
      state: Joi.string().max(100).allow(null, ''),
      country: Joi.string().max(100).allow(null, ''),
      postalCode: Joi.string().max(20).allow(null, ''),
      taxId: Joi.string().max(50).allow(null, ''),
      status: Joi.string().valid('Active', 'Inactive'),
    }),
  }),
  CompanyController.update
);
router.delete('/:id', validate({ params: Joi.object({ id: schemas.id }) }), CompanyController.delete);
router.get('/:id/contacts', validate({ params: Joi.object({ id: schemas.id }) }), CompanyController.getContacts);
router.post(
  '/:id/contacts',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().allow(null, ''),
      phone: Joi.string().max(20).allow(null, ''),
      mobile: Joi.string().max(20).allow(null, ''),
      position: Joi.string().max(100).allow(null, ''),
      department: Joi.string().max(100).allow(null, ''),
      isPrimary: Joi.boolean(),
      notes: Joi.string().allow(null, ''),
    }),
  }),
  CompanyController.addContact
);
router.put(
  '/:id/contacts/:contactId',
  validate({
    params: Joi.object({ id: schemas.id, contactId: schemas.id }),
    body: Joi.object({
      firstName: Joi.string(),
      lastName: Joi.string(),
      email: Joi.string().email().allow(null, ''),
      phone: Joi.string().max(20).allow(null, ''),
      mobile: Joi.string().max(20).allow(null, ''),
      position: Joi.string().max(100).allow(null, ''),
      department: Joi.string().max(100).allow(null, ''),
      isPrimary: Joi.boolean(),
      notes: Joi.string().allow(null, ''),
    }),
  }),
  CompanyController.updateContact
);
router.delete(
  '/:id/contacts/:contactId',
  validate({ params: Joi.object({ id: schemas.id, contactId: schemas.id }) }),
  CompanyController.deleteContact
);

export default router;

