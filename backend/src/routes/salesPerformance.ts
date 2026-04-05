import { Router } from 'express';
import { getOverview, getProductLinePerformance, getTeamPerformance, getIndividualPerformance, getLeaderboard, getTrends, getPipelineAnalysis } from '../controllers/salesPerformanceController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Overview dashboard
router.get('/overview', getOverview);

// Performance by product line
router.get('/product-lines', getProductLinePerformance);

// Team performance (for sales heads)
router.get('/team', getTeamPerformance);

// Individual performance
router.get('/individual', getIndividualPerformance);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

// Trends over time
router.get('/trends', getTrends);

// Pipeline analysis
router.get('/pipeline', getPipelineAnalysis);

export default router;
