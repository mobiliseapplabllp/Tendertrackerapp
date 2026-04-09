import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard', ReportController.getDashboard);
router.get('/team-performance', ReportController.getTeamPerformance);
router.get('/tenders', ReportController.getTenderReports);
router.get('/performance', ReportController.getPerformance);
router.get('/export', ReportController.export);

export default router;

