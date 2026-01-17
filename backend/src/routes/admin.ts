import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// All routes require Admin authentication
router.use(authenticate);
router.use(authorize('Admin'));

router.get('/config', AdminController.getConfig);
router.put(
  '/config',
  validate({
    body: Joi.object({
      configKey: Joi.string().required(),
      configValue: Joi.string().allow('').required(), // Allow empty strings
      configType: Joi.string().valid('string', 'number', 'boolean', 'json').optional(),
      description: Joi.string().allow('').optional(),
    }),
  }),
  AdminController.updateConfig
);
router.post(
  '/email/test',
  validate({
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  }),
  AdminController.testEmail
);
router.post(
  '/sms/test',
  validate({
    body: Joi.object({
      phoneNumber: Joi.string().required(),
    }),
  }),
  AdminController.testSMS
);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/email-alerts', AdminController.getEmailAlerts);
router.put(
  '/email-alerts',
  validate({
    body: Joi.object({
      recipients: Joi.array().items(Joi.string().email()).required(),
      schedule: Joi.object({
        days30: Joi.boolean(),
        days15: Joi.boolean(),
        days10: Joi.boolean(),
        days7: Joi.boolean(),
        days3: Joi.boolean(),
        days2: Joi.boolean(),
        days1: Joi.boolean(),
        overdue: Joi.boolean(),
      }).required(),
    }),
  }),
  AdminController.updateEmailAlerts
);
router.post('/email-alerts/test', AdminController.sendTestNotifications);
router.post(
  '/email-alerts/run',
  validate({
    body: Joi.object({
      alertType: Joi.string().valid('days30', 'days15', 'days10', 'days7', 'days3', 'days2', 'days1', 'overdue').required(),
    }),
  }),
  AdminController.runNotificationSchedule
);
router.post(
  '/email-alerts/custom',
  validate({
    body: Joi.object({
      subject: Joi.string().required(),
      message: Joi.string().required(),
      categoryId: Joi.number().integer().positive().allow(null),
      daysUntilDeadline: Joi.number().integer().allow(null),
    }),
  }),
  AdminController.sendCustomAlert
);

export default router;

