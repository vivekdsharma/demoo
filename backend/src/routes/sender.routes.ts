import { Router } from 'express';
import { getSenders, createSender, updateSender } from '../controllers/sender.controller.js';

const router = Router();

router.get('/', getSenders);
router.post('/', createSender);
router.put('/:id', updateSender);

export default router;
