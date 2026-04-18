import { Router } from 'express';
import { LeadCaptureController } from '../controllers/leadCaptureController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Apply authentication to all lead capture routes
// NOTE: Public form endpoints (getPublicForm, submitForm) are registered separately in app.ts
router.use(authenticate);

// ==================== Forms ====================
router.get('/forms', LeadCaptureController.getForms);

router.post(
  '/forms',
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      title: Joi.string().max(255).allow(null, ''),
      description: Joi.string().max(1000).allow(null, ''),
      fields: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          label: Joi.string().required(),
          type: Joi.string().valid('text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'number', 'date', 'url').required(),
          required: Joi.boolean().optional(),
          options: Joi.array().items(Joi.string()).optional(),
          placeholder: Joi.string().allow(null, '').optional(),
        })
      ).optional(),
      thank_you_message: Joi.string().max(1000).allow(null, ''),
      redirect_url: Joi.string().uri().max(500).allow(null, ''),
      is_active: Joi.boolean().optional(),
    }).options({ allowUnknown: true }),
  }),
  LeadCaptureController.createForm
);

router.get(
  '/forms/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  LeadCaptureController.getFormById
);

router.put(
  '/forms/:id',
  validate({
    params: Joi.object({ id: schemas.id }),
    body: Joi.object({
      name: Joi.string().min(1).max(255),
      title: Joi.string().max(255).allow(null, ''),
      description: Joi.string().max(1000).allow(null, ''),
      fields: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          label: Joi.string().required(),
          type: Joi.string().valid('text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'number', 'date', 'url').required(),
          required: Joi.boolean().optional(),
          options: Joi.array().items(Joi.string()).optional(),
          placeholder: Joi.string().allow(null, '').optional(),
        })
      ),
      thank_you_message: Joi.string().max(1000).allow(null, ''),
      redirect_url: Joi.string().uri().max(500).allow(null, ''),
      is_active: Joi.boolean(),
    }).options({ allowUnknown: true }),
  }),
  LeadCaptureController.updateForm
);

router.delete(
  '/forms/:id',
  validate({ params: Joi.object({ id: schemas.id }) }),
  LeadCaptureController.deleteForm
);

// ==================== Submissions ====================
router.get('/submissions', LeadCaptureController.getSubmissions);

router.post(
  '/submissions/:id/convert',
  validate({ params: Joi.object({ id: schemas.id }) }),
  LeadCaptureController.convertToLead
);

export default router;
