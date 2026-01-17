import { Router } from 'express';
import { ActivityController } from '../controllers/activityController';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all activities for a lead
router.get(
  '/leads/:leadId',
  validate({
    params: Joi.object({
      leadId: schemas.id,
    }),
    query: Joi.object({
      type: Joi.string().valid('call', 'meeting', 'email', 'task').optional(),
    }),
  }),
  ActivityController.getByLead
);

// Call routes
router.post(
  '/leads/:leadId/calls',
  validate({
    params: Joi.object({
      leadId: schemas.id,
    }),
    body: Joi.object({
      subject: Joi.string().required(),
      callType: Joi.string().valid('Outbound', 'Inbound').optional(),
      durationMinutes: Joi.number().integer().min(0).optional(),
      callDate: Joi.string().isoDate().required(),
      notes: Joi.string().allow(null, '').optional(),
    }),
  }),
  ActivityController.createCall
);

router.put(
  '/leads/:leadId/calls/:callId',
  validate({
    params: Joi.object({
      leadId: schemas.id,
      callId: schemas.id,
    }),
    body: Joi.object({
      subject: Joi.string().optional(),
      callType: Joi.string().valid('Outbound', 'Inbound').optional(),
      durationMinutes: Joi.number().integer().min(0).optional(),
      callDate: Joi.string().isoDate().optional(),
      notes: Joi.string().allow(null, '').optional(),
    }),
  }),
  ActivityController.updateCall
);

router.delete(
  '/leads/:leadId/calls/:callId',
  validate({
    params: Joi.object({
      leadId: schemas.id,
      callId: schemas.id,
    }),
  }),
  ActivityController.deleteCall
);

// Meeting routes
router.post(
  '/leads/:leadId/meetings',
  validate({
    params: Joi.object({
      leadId: schemas.id,
    }),
    body: Joi.object({
      subject: Joi.string().required(),
      meetingDate: Joi.string().isoDate().required(),
      location: Joi.string().allow(null, '').optional(),
      notes: Joi.string().allow(null, '').optional(),
    }),
  }),
  ActivityController.createMeeting
);

router.put(
  '/leads/:leadId/meetings/:meetingId',
  validate({
    params: Joi.object({
      leadId: schemas.id,
      meetingId: schemas.id,
    }),
    body: Joi.object({
      subject: Joi.string().optional(),
      meetingDate: Joi.string().isoDate().optional(),
      location: Joi.string().allow(null, '').optional(),
      notes: Joi.string().allow(null, '').optional(),
    }),
  }),
  ActivityController.updateMeeting
);

router.delete(
  '/leads/:leadId/meetings/:meetingId',
  validate({
    params: Joi.object({
      leadId: schemas.id,
      meetingId: schemas.id,
    }),
  }),
  ActivityController.deleteMeeting
);

// Email routes
router.post(
  '/leads/:leadId/emails',
  validate({
    params: Joi.object({
      leadId: schemas.id,
    }),
    body: Joi.object({
      subject: Joi.string().required(),
      sender: Joi.string().email().required(),
      recipients: Joi.alternatives().try(
        Joi.string().email(),
        Joi.array().items(Joi.string().email())
      ).required(),
      body: Joi.string().allow(null, '').optional(),
    }),
  }),
  ActivityController.createEmail
);

// Task routes
router.post(
  '/leads/:leadId/tasks',
  validate({
    params: Joi.object({
      leadId: schemas.id,
    }),
    body: Joi.object({
      title: Joi.string().required(),
      description: Joi.string().allow(null, '').optional(),
      dueDate: Joi.string().isoDate().optional(),
      priority: Joi.string().valid('Low', 'Medium', 'High').optional(),
      status: Joi.string().valid('Pending', 'In Progress', 'Completed', 'Deferred').optional(),
    }),
  }),
  ActivityController.createTask
);

router.put(
  '/leads/:leadId/tasks/:taskId',
  validate({
    params: Joi.object({
      leadId: schemas.id,
      taskId: schemas.id,
    }),
    body: Joi.object({
      title: Joi.string().optional(),
      description: Joi.string().allow(null, '').optional(),
      dueDate: Joi.string().isoDate().optional(),
      priority: Joi.string().valid('Low', 'Medium', 'High').optional(),
      status: Joi.string().valid('Pending', 'In Progress', 'Completed', 'Deferred').optional(),
    }),
  }),
  ActivityController.updateTask
);

router.delete(
  '/leads/:leadId/tasks/:taskId',
  validate({
    params: Joi.object({
      leadId: schemas.id,
      taskId: schemas.id,
    }),
  }),
  ActivityController.deleteTask
);

export default router;


