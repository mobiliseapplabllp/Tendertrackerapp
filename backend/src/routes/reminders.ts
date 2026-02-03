import express from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { ReminderController } from '../controllers/reminderController';
import Joi from 'joi';
import { schemas } from '../middleware/validation';

const router = express.Router();

// Create reminder for a work log entry
router.post(
  '/activities/:activityId/reminders',
  authenticate,
  validate({
    params: Joi.object({
      activityId: schemas.id,
    }),
    body: Joi.object({
      actionRequired: Joi.string().required(),
      dueDate: Joi.date().allow(null, ''),
      recipients: Joi.array().items(
        Joi.object({
          email: Joi.string().email().allow(null, ''),
          phoneNumber: Joi.string().allow(null, ''),
          userId: Joi.number().integer().positive().allow(null),
        }).or('email', 'phoneNumber', 'userId')
      ).optional().default([]),
      sendEmail: Joi.boolean().optional().default(true),
      sendSMS: Joi.boolean().optional().default(false),
    }),
  }),
  ReminderController.create
);

// Get all reminders for a work log entry
router.get(
  '/activities/:activityId/reminders',
  authenticate,
  validate({
    params: Joi.object({
      activityId: schemas.id,
    }),
  }),
  ReminderController.getByActivity
);

// Mark reminder as complete
router.post(
  '/reminders/:reminderId/complete',
  authenticate,
  validate({
    params: Joi.object({
      reminderId: schemas.id,
    }),
  }),
  ReminderController.markComplete
);

// Delete reminder
router.delete(
  '/reminders/:reminderId',
  authenticate,
  validate({
    params: Joi.object({
      reminderId: schemas.id,
    }),
  }),
  ReminderController.delete
);

// Manually send notification
router.post(
  '/:id/notify',
  authenticate,
  validate({
    params: Joi.object({
      id: schemas.id,
    }),
    body: Joi.object({
      type: Joi.string().valid('email', 'sms').required(),
    }),
  }),
  ReminderController.notify
);

export default router;

