import { Router } from 'express';
import {
  getSlackAuthUrl,
  handleSlackCallback,
  saveSlackWebhook,
  disconnectSlack,
  getSlackStatus,
  testSlackAlert,
} from '../controllers/slack.controller.js';

const router = Router();

router.get('/auth-url', getSlackAuthUrl);
router.get('/callback', handleSlackCallback);
router.post('/webhook', saveSlackWebhook);
router.delete('/disconnect', disconnectSlack);
router.get('/status', getSlackStatus);
router.post('/test', testSlackAlert);

export default router;
