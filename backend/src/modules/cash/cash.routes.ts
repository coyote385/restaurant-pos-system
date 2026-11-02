import { Router } from 'express';
import { CashController } from './cash.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

router.use(authenticateToken);

router.get('/current', requireRoles([Role.CASHIER, Role.ADMIN]), CashController.getCurrentShift);
router.post('/open', requireRoles([Role.CASHIER, Role.ADMIN]), CashController.openShift);
router.post('/close', requireRoles([Role.CASHIER, Role.ADMIN]), CashController.closeShift);
router.get('/history', requireRoles([Role.ADMIN, Role.CASHIER]), CashController.getHistory);

export default router;
