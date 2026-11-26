import express from 'express';
import {
  getItemReviewSummary,
  getStatus,
  postAssistant,
  postListingDraft,
} from '../controllers/ai.controller.js';
import { verifyToken } from '../middleware/jwt.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import { assistantSchema, listingDraftSchema } from '../schemas/ai.schema.js';

const router = express.Router();

router.get('/status', getStatus);
router.post(
  '/listing-draft',
  verifyToken,
  aiLimiter,
  validate(listingDraftSchema),
  postListingDraft
);
router.post('/assistant', aiLimiter, validate(assistantSchema), postAssistant);
router.get('/review-summary/:itemId', getItemReviewSummary);

export default router;
