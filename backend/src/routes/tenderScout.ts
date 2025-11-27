import express from 'express';
import { tenderScoutController } from '../controllers/tenderScoutController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ==================== SOURCES (Admin only) ====================
router.get('/sources', authorize('Admin'), tenderScoutController.getSources);
router.post('/sources', authorize('Admin'), tenderScoutController.createSource);
router.put('/sources/:id', authorize('Admin'), tenderScoutController.updateSource);
router.delete('/sources/:id', authorize('Admin'), tenderScoutController.deleteSource);

// ==================== INTERESTS ====================
router.get('/interests', tenderScoutController.getInterests);
router.post('/interests', tenderScoutController.createInterest);
router.put('/interests/:id', tenderScoutController.updateInterest);
router.delete('/interests/:id', tenderScoutController.deleteInterest);

// ==================== RESULTS ====================
router.get('/results', tenderScoutController.getResults);
router.get('/results/:id', tenderScoutController.getResultById);
router.put('/results/:id/status', tenderScoutController.updateResultStatus);
router.post('/results/:id/import', tenderScoutController.importResult);
router.delete('/results/:id', tenderScoutController.deleteResult);

// ==================== SCOUT EXECUTION ====================
router.post('/run', authorize('Admin', 'Manager'), tenderScoutController.runScout);
router.get('/logs', authorize('Admin', 'Manager'), tenderScoutController.getLogs);
router.get('/stats', tenderScoutController.getStats);
router.post('/ai-search', authorize('Admin', 'Manager'), tenderScoutController.aiSearch);
router.post('/results/delete-bulk', authorize('Admin', 'Manager'), tenderScoutController.deleteResultsBulk);

export default router;
