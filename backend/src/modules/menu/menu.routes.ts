import { Router } from 'express';
import { MenuController } from './menu.controller';
import { authenticateToken, requireRoles } from '../../middlewares/auth.middleware';
import { Role } from '../../types/enums';

const router = Router();

router.get('/categories', MenuController.getCategories);
router.get('/products', MenuController.getProducts);

router.post('/products', authenticateToken, requireRoles([Role.ADMIN]), MenuController.createProduct);
router.patch('/products/:id/toggle-availability', authenticateToken, requireRoles([Role.ADMIN, Role.KITCHEN]), MenuController.toggleAvailability);

export default router;
