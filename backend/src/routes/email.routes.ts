import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import {
  scheduleEmails,
  uploadLeadsFile,
  getScheduledEmails,
  getSentEmails,
  searchAllEmails,
  cancelEmail,
} from '../controllers/email.controller.js';

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = Router();

router.post('/schedule', scheduleEmails);
router.post('/upload-leads', upload.single('file'), uploadLeadsFile);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/search', searchAllEmails);
router.delete('/:id', cancelEmail);

export default router;
