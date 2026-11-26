import express from 'express';
import { createReview, getReviews, deleteReview } from '../controllers/review.controller.js';
import { verifyToken } from '../middleware/jwt.js';
import validate from '../middleware/validate.js';
import { createReviewSchema } from '../schemas/review.schema.js';

const router = express.Router();

router.post('/', verifyToken, validate(createReviewSchema), createReview);
router.get('/:itemId', getReviews);
router.delete('/:id', verifyToken, deleteReview);

export default router;
