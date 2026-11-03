import { Router } from 'express';
import { googleLogin, getCurrentUser } from '../controllers/auth.controller.js';

const router = Router();

router.post('/google', googleLogin);
router.get('/me', getCurrentUser);

export default router;
