import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRoles([Role.WAITER, Role.ADMIN]), OrderController.create);
router.get('/kitchen', OrderController.getKitchenOrders);
router.patch('/:id/status', requireRoles([Role.KITCHEN, Role.ADMIN, Role.CASHIER]), OrderController.updateStatus);
router.patch('/items/:itemId/status', requireRoles([Role.KITCHEN, Role.ADMIN, Role.CASHIER, Role.WAITER]), OrderController.updateItemStatus);
router.post('/:id/pay', requireRoles([Role.CASHIER, Role.ADMIN, Role.WAITER]), OrderController.payOrder);

export default router;
