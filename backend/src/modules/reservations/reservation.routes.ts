import { Router } from 'express';
import { ReservationController } from './reservation.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

router.use(authenticateToken);

// Listar y crear pueden hacerlo meseros y administradores
router.get('/', ReservationController.list);
router.post('/', requireRoles([Role.WAITER, Role.ADMIN]), ReservationController.create);
router.post('/:id/seat', requireRoles([Role.WAITER, Role.ADMIN]), ReservationController.seat);
router.post('/:id/cancel', requireRoles([Role.WAITER, Role.ADMIN]), ReservationController.cancel);

export default router;
