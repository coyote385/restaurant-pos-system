import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

// Todas las rutas de gestión de colaboradores están protegidas solo para administradores
router.use(authenticateToken, requireRoles([Role.ADMIN]));

router.get('/', UserController.listUsers);
router.post('/', UserController.createUser);
router.patch('/:id', UserController.updateUser);
router.patch('/:id/toggle-status', UserController.toggleStatus);
router.patch('/:id/pin', UserController.updatePin);

export default router;
