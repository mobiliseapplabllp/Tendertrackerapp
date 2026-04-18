import { Router } from 'express';
import { ApolloController } from '../controllers/apolloController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Search people in Apollo
router.post(
  '/search-people',
  validate({
    body: Joi.object({
      person_titles: Joi.array().items(Joi.string()).optional(),
      person_locations: Joi.array().items(Joi.string()).optional(),
      organization_locations: Joi.array().items(Joi.string()).optional(),
      person_seniorities: Joi.array().items(Joi.string()).optional(),
      q_keywords: Joi.string().allow('').optional(),
      organization_num_employees_ranges: Joi.array().items(Joi.string()).optional(),
      q_organization_keyword_tags: Joi.array().items(Joi.string()).optional(),
      page: Joi.number().integer().min(1).optional(),
      per_page: Joi.number().integer().min(1).max(100).optional(),
    }).options({ allowUnknown: true }),
  }),
  ApolloController.searchPeople
);

// Search companies in Apollo
router.post(
  '/search-companies',
  validate({
    body: Joi.object({
      q_organization_name: Joi.string().allow('').optional(),
      organization_locations: Joi.array().items(Joi.string()).optional(),
      organization_num_employees_ranges: Joi.array().items(Joi.string()).optional(),
      q_organization_keyword_tags: Joi.array().items(Joi.string()).optional(),
      page: Joi.number().integer().min(1).optional(),
      per_page: Joi.number().integer().min(1).max(100).optional(),
    }).options({ allowUnknown: true }),
  }),
  ApolloController.searchCompanies
);

// Import Apollo contacts into CRM
router.post(
  '/import',
  validate({
    body: Joi.object({
      people: Joi.array().items(Joi.object().unknown(true)).min(1).required(),
      listId: Joi.number().integer().positive().optional(),
    }).options({ allowUnknown: true }),
  }),
  ApolloController.importContacts
);

// Enrich a CRM company with Apollo data
router.post(
  '/enrich-company/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  ApolloController.enrichCompany
);

// Enrich a CRM contact with Apollo data
router.post(
  '/enrich-contact/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  ApolloController.enrichContact
);

// Get import history
router.get(
  '/import-history',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
    }),
  }),
  ApolloController.getImportHistory
);

// Get Apollo configuration status
router.get('/config', ApolloController.getConfig);

export default router;
