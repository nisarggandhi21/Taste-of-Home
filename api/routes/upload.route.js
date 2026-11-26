import express from 'express';
import { getUploadSignature } from '../controllers/upload.controller.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Open to visitors too: the profile picture is uploaded while registering.
router.post('/signature', uploadLimiter, getUploadSignature);

export default router;
