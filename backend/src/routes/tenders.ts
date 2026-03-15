import { Router } from 'express';
import { TenderController } from '../controllers/tenderController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all tenders
router.get(
  '/',
  TenderController.getAll
);

// Get tender by ID
router.get(
  '/:id',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TenderController.getById
);

// Create tender
router.post(
  '/',
  validate({
    body: Joi.object({
      tenderNumber: Joi.string().required(),
      title: Joi.string().required(),
      description: Joi.string().allow(null, ''),
      companyId: Joi.number().integer().positive().allow(null),
      categoryId: Joi.number().integer().positive().allow(null),
      status: Joi.string().valid('Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Won', 'Lost', 'Cancelled'),
      priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
      estimatedValue: Joi.number().positive().allow(null),
      currency: Joi.string().length(3),
      submissionDeadline: Joi.date().allow(null),
      expectedAwardDate: Joi.date().allow(null),
      contractDurationMonths: Joi.number().integer().positive().allow(null),
      assignedTo: Joi.number().integer().positive().allow(null),
      tagIds: Joi.array().items(Joi.number().integer().positive()),
      emdAmount: Joi.number().min(0).allow(null),
      tenderFees: Joi.number().min(0).allow(null),
      productLineId: Joi.number().integer().positive().allow(null),
      subCategory: Joi.string().valid('Software', 'Hardware').allow(null, ''),
    }),
  }),
  TenderController.create
);

// Update tender
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
      leadTypeId: Joi.number().integer().positive().allow(null), // Added to support converting back to Lead
      status: Joi.string().valid('Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Won', 'Lost', 'Cancelled'),
      priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
      estimatedValue: Joi.number().positive().allow(null),
      currency: Joi.string().length(3),
      submissionDeadline: Joi.date().allow(null),
      expectedAwardDate: Joi.date().allow(null),
      contractDurationMonths: Joi.number().integer().positive().allow(null),
      assignedTo: Joi.number().integer().positive().allow(null),
      tagIds: Joi.array().items(Joi.number().integer().positive()),
      emdAmount: Joi.number().min(0).allow(null),
      tenderFees: Joi.number().min(0).allow(null),
      productLineId: Joi.number().integer().positive().allow(null),
      subCategory: Joi.string().valid('Software', 'Hardware').allow(null, ''),
    }),
  }),
  TenderController.update
);

// Restore soft-deleted tender (Admin only) - Must come before /:id routes
router.post(
  '/:id/restore',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TenderController.restore
);

// Permanently delete tender and all associated data (Admin only) - Must come before /:id route
router.delete(
  '/:id/permanent',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TenderController.permanentDelete
);

// Delete tender (Admin only) - Must come after more specific routes
router.delete(
  '/:id',
  authorize('Admin'),
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TenderController.delete
);

// Get tender activities
router.get(
  '/:id/activities',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TenderController.getActivities
);

// Get tender reminders
router.get(
  '/:id/reminders',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TenderController.getReminders
);

// Generate AI Summary
router.post(
  '/:id/summary',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
  }),
  TenderController.generateSummary
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
  TenderController.sendSummaryEmail
);

// Update tender activity (work log entry)
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
  TenderController.updateActivity
);

// Delete tender activity (work log entry)
router.delete(
  '/:id/activities/:activityId',
  authenticate,
  validate({
    params: Joi.object({
      id: schemas.id,
      activityId: schemas.id,
    }),
  }),
  TenderController.deleteActivity
);

// Add tender activity
router.post(
  '/:id/activities',
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      activityType: Joi.string().valid('Created', 'Updated', 'Commented', 'Status Changed', 'Document Added', 'Assigned', 'Deadline Changed', 'Task').required(),
      description: Joi.string().required(),
      oldValue: Joi.string().allow(null, ''),
      newValue: Joi.string().allow(null, ''),
      hoursSpent: Joi.number().min(0).allow(null),
      workDate: Joi.date().allow(null),
    }),
  }),
  TenderController.addActivity
);

// Chat about tender
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
  TenderController.chat
);

export default router;

