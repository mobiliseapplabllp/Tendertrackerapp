import { Router } from 'express';
import { LeadController } from '../controllers/leadController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all leads
router.get(
  '/',
  LeadController.getAll
);

// Get lead by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadController.getById
);

// Create lead
router.post(
  '/',
  validate({
    body: Joi.object({
      leadNumber: Joi.string().optional().allow(null, ''),
      title: Joi.string().required(),
      description: Joi.string().allow(null, ''),
      companyId: Joi.number().integer().positive().allow(null),
      categoryId: Joi.number().integer().positive().allow(null),
      leadTypeId: Joi.number().integer().positive().allow(null),
      salesStageId: Joi.number().integer().positive().allow(null),
      status: Joi.string().valid('Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Won', 'Lost', 'Cancelled'),
      priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
      estimatedValue: Joi.number().positive().allow(null),
      dealValue: Joi.number().positive().allow(null),
      probability: Joi.number().integer().min(0).max(100).allow(null),
      currency: Joi.string().length(3),
      submissionDeadline: Joi.date().allow(null),
      expectedAwardDate: Joi.date().allow(null),
      expectedCloseDate: Joi.date().allow(null),
      contractDurationMonths: Joi.number().integer().positive().allow(null),
      assignedTo: Joi.number().integer().positive().allow(null),
      tagIds: Joi.array().items(Joi.number().integer().positive()),
      emdAmount: Joi.number().min(0).allow(null),
      tenderFees: Joi.number().min(0).allow(null),
      source: Joi.string().allow(null, ''),
      productLineId: Joi.number().integer().positive().allow(null),
      subCategory: Joi.string().valid('Software', 'Hardware').allow(null, ''),
    }),
  }),
  LeadController.create
);

// Update lead
router.put(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      title: Joi.string(),
      description: Joi.string().allow(null, ''),
      companyId: Joi.number().integer().positive().allow(null),
      categoryId: Joi.number().integer().positive().allow(null),
      leadTypeId: Joi.number().integer().positive().allow(null),
      salesStageId: Joi.number().integer().positive().allow(null),
      status: Joi.string().valid('Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Won', 'Lost', 'Cancelled'),
      priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
      estimatedValue: Joi.number().positive().allow(null),
      dealValue: Joi.number().positive().allow(null),
      probability: Joi.number().integer().min(0).max(100).allow(null),
      currency: Joi.string().length(3),
      submissionDeadline: Joi.date().allow(null),
      expectedAwardDate: Joi.date().allow(null),
      expectedCloseDate: Joi.date().allow(null),
      contractDurationMonths: Joi.number().integer().positive().allow(null),
      assignedTo: Joi.number().integer().positive().allow(null),
      tagIds: Joi.array().items(Joi.number().integer().positive()),
      emdAmount: Joi.number().min(0).allow(null),
      tenderFees: Joi.number().min(0).allow(null),
      source: Joi.string().allow(null, ''),
      productLineId: Joi.number().integer().positive().allow(null),
      subCategory: Joi.string().valid('Software', 'Hardware').allow(null, ''),
    }),
  }),
  LeadController.update
);

// Restore soft-deleted lead (Admin only) - Must come before /:id routes
router.post(
  '/:id/restore',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadController.restore
);

// Permanently delete lead and all associated data (Admin only) - Must come before /:id route
router.delete(
  '/:id/permanent',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadController.permanentDelete
);

// Delete lead (Admin only) - Must come after more specific routes
router.delete(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadController.delete
);

// Get lead activities
router.get(
  '/:id/activities',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadController.getActivities
);

// Generate AI Summary
router.post(
  '/:id/summary',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  LeadController.generateSummary
);

// Send AI Summary via Email
router.post(
  '/:id/summary/email',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  }),
  LeadController.sendSummaryEmail
);

// Update lead activity (work log entry)
router.put(
  '/:id/activities/:activityId',
  authenticate,
  validate({
    params: Joi.object({
      id: schemas.id,
      activityId: schemas.id,
    }),
    body: Joi.object({
      description: Joi.string().required(),
    }),
  }),
  LeadController.updateActivity
);

// Delete lead activity (work log entry)
router.delete(
  '/:id/activities/:activityId',
  authenticate,
  validate({
    params: Joi.object({
      id: schemas.id,
      activityId: schemas.id,
    }),
  }),
  LeadController.deleteActivity
);

// Add lead activity
router.post(
  '/:id/activities',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      activityType: Joi.string().valid('Created', 'Updated', 'Commented', 'Status Changed', 'Document Added', 'Assigned', 'Deadline Changed').required(),
      description: Joi.string().required(),
      oldValue: Joi.string().allow(null, ''),
      newValue: Joi.string().allow(null, ''),
    }),
  }),
  LeadController.addActivity
);

// Chat about lead
router.post(
  '/:id/chat',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      question: Joi.string().required().min(1),
      chatHistory: Joi.array().items(
        Joi.object({
          role: Joi.string().valid('user', 'assistant').required(),
          content: Joi.string().required(),
        })
      ).optional(),
    }),
  }),
  LeadController.chat
);

// Convert lead to deal
router.post(
  '/:id/convert',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      dealName: Joi.string().required(),
      dealValue: Joi.number().positive().required(),
      expectedCloseDate: Joi.date().required(),
      probability: Joi.number().integer().min(0).max(100).default(50),
    }),
  }),
  LeadController.convertToDeal
);

// Update sales stage
router.put(
  '/:id/stage',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      salesStageId: Joi.number().integer().positive().required(),
    }),
  }),
  LeadController.updateStage
);

// Get pipeline view
router.get(
  '/pipeline/view',
  LeadController.getPipeline
);

export default router;


