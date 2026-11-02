import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

router.use(authenticateToken);

router.get('/my-tips', requireRoles([Role.WAITER, Role.ADMIN]), ReportController.getMyTips);
router.get('/shift-summary', requireRoles([Role.ADMIN]), ReportController.getShiftSummary);
router.get('/daily-dashboard', requireRoles([Role.ADMIN]), ReportController.getDailyDashboard);

export default router;
