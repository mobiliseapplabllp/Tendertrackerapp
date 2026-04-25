import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/ai-summary', ReportController.aiDashboardSummary);
router.get('/dashboard', ReportController.getDashboard);
router.get('/team-matrix', ReportController.getTeamMatrix);
router.get('/team-matrix/leads', ReportController.getTeamMatrixLeads);
router.get('/team-matrix/lead-details/:id', ReportController.getTeamMatrixLeadDetails);
router.get('/team-performance', ReportController.getTeamPerformance);
router.get('/tenders', ReportController.getTenderReports);
router.get('/performance', ReportController.getPerformance);
router.get('/export', ReportController.export);

export default router;

