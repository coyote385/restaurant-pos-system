import { Router } from 'express';
import { TableController } from './table.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

router.use(authenticateToken);

router.get('/', TableController.getTables);
router.post('/', requireRoles([Role.ADMIN]), TableController.createTable);
router.patch('/:id', requireRoles([Role.ADMIN]), TableController.updateTable);
router.delete('/:id', requireRoles([Role.ADMIN]), TableController.deleteTable);
router.patch('/:id/status', TableController.updateStatus);
router.patch('/:id/position', requireRoles([Role.ADMIN]), TableController.updatePosition);
router.post('/:id/merge', requireRoles([Role.WAITER, Role.ADMIN, Role.CASHIER]), TableController.mergeTables);
router.post('/:id/unmerge', requireRoles([Role.WAITER, Role.ADMIN, Role.CASHIER]), TableController.unmergeTable);
router.post('/:id/pay', requireRoles([Role.CASHIER, Role.ADMIN, Role.WAITER]), TableController.payTable);

export default router;
