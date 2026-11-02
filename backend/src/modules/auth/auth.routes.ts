import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();

router.post('/waiter-login', AuthController.waiterLogin);
router.post('/admin-login', AuthController.adminLogin);

export default router;
