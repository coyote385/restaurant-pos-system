import { Router } from 'express';
import { ShiftController } from './shift.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();
router.use(authenticateToken);

router.post('/open', requireRoles([Role.WAITER, Role.ADMIN]), ShiftController.open);
router.post('/close', requireRoles([Role.WAITER, Role.ADMIN]), ShiftController.close);
router.get('/my-current', requireRoles([Role.WAITER, Role.ADMIN]), ShiftController.myCurrent);
router.get('/history', requireRoles([Role.ADMIN]), ShiftController.history);

export default router;
