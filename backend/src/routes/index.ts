import { Router } from 'express';
import emailRoutes from './email.routes.js';
import senderRoutes from './sender.routes.js';
import slackRoutes from './slack.routes.js';
import authRoutes from './auth.routes.js';
import { getStats } from '../controllers/stats.controller.js';

const router = Router();

router.use('/emails', emailRoutes);
router.use('/senders', senderRoutes);
router.use('/slack', slackRoutes);
router.use('/auth', authRoutes);
router.get('/stats', getStats);

export default router;
