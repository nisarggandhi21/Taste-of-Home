import express from 'express';
import {
  createReview,
  deleteReview,
  getReviews,
  voteReview,
} from '../controllers/review.controller.js';
import { verifyToken } from '../middleware/jwt.js';
import validate from '../middleware/validate.js';
import { createReviewSchema, voteSchema } from '../schemas/review.schema.js';

const router = express.Router();

router.post('/', verifyToken, validate(createReviewSchema), createReview);
router.get('/:itemId', getReviews);
router.delete('/:id', verifyToken, deleteReview);
router.post('/:id/vote', verifyToken, validate(voteSchema), voteReview);

export default router;
