import { Router } from 'express';
import { PermissionController } from '../controllers/permissionController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// All permission routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

// Get full permission matrix
router.get('/', PermissionController.getMatrix);

// Update a single permission toggle
router.put('/', PermissionController.updatePermission);

// Bulk update all permissions in a group for a role
router.put('/bulk', PermissionController.bulkUpdate);

// Reset all permissions to defaults
router.post('/reset', PermissionController.resetDefaults);

export default router;
