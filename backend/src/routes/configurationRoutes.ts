import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { configurationController } from '../controllers/configurationController';

const router = Router();

// All configuration routes require authentication and admin role
router.use(authenticate);
router.use(authorize('Admin', 'SuperAdmin'));

// System Settings Routes
router.get('/settings', configurationController.getAllSettings.bind(configurationController));
router.get('/settings/:key', configurationController.getSetting.bind(configurationController));
router.put('/settings/:key', configurationController.updateSetting.bind(configurationController));

// Dropdown Options Routes
router.get('/dropdown/:type', configurationController.getDropdownOptions.bind(configurationController));
router.post('/dropdown', configurationController.createDropdownOption.bind(configurationController));
router.put('/dropdown/:id', configurationController.updateDropdownOption.bind(configurationController));
router.delete('/dropdown/:id', configurationController.deleteDropdownOption.bind(configurationController));

// Cache Management
router.post('/cache/clear', configurationController.clearCache.bind(configurationController));

export default router;
