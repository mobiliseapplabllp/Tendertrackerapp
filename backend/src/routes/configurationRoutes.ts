import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { configurationController } from '../controllers/configurationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read-only dropdown fetch — available to all authenticated roles
router.get('/dropdown/:type', configurationController.getDropdownOptions.bind(configurationController));

// Everything below requires Admin / SuperAdmin
router.use(authorize('Admin', 'SuperAdmin'));

// System Settings Routes
router.get('/settings', configurationController.getAllSettings.bind(configurationController));
router.get('/settings/:key', configurationController.getSetting.bind(configurationController));
router.put('/settings/:key', configurationController.updateSetting.bind(configurationController));

// Dropdown write operations (Admin only)
router.post('/dropdown', configurationController.createDropdownOption.bind(configurationController));
router.put('/dropdown/:id', configurationController.updateDropdownOption.bind(configurationController));
router.delete('/dropdown/:id', configurationController.deleteDropdownOption.bind(configurationController));

// Cache Management
router.post('/cache/clear', configurationController.clearCache.bind(configurationController));

export default router;
