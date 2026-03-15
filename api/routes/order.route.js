import express from 'express';
import { verifyToken } from '../middleware/jwt.js';
import { getOrders, intent, confirm, completeOrder } from '../controllers/order.controller.js';

const router = express.Router();

// router.post("/:itemId", verifyToken, createOrder);

router.get('/', verifyToken, getOrders);
router.post('/create-payment-intent/:id', verifyToken, intent);
router.put('/', verifyToken, confirm);
router.patch('/complete/:id', verifyToken, completeOrder);

export default router;
