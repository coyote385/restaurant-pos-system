import { Router } from 'express';
import { WasteController } from './waste.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

router.use(authenticateToken);

router.post('/cancel-item', requireRoles([Role.WAITER, Role.KITCHEN, Role.ADMIN]), WasteController.cancelItem);
router.post('/cancel-order', requireRoles([Role.WAITER, Role.KITCHEN, Role.ADMIN]), WasteController.cancelOrder);
router.get('/logs', requireRoles([Role.ADMIN]), WasteController.getLogs);

export default router;
