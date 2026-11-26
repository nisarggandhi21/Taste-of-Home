import express from 'express';
import {
  cancelOrder,
  checkout,
  confirm,
  getOrders,
  getSummary,
  intent,
  updateStatus,
} from '../controllers/order.controller.js';
import { verifyToken } from '../middleware/jwt.js';
import validate from '../middleware/validate.js';
import {
  cancelSchema,
  cartCheckoutSchema,
  checkoutSchema,
  updateStatusSchema,
} from '../schemas/order.schema.js';

const router = express.Router();

router.get('/', verifyToken, getOrders);
router.get('/summary', verifyToken, getSummary);
router.post('/create-payment-intent/:id', verifyToken, validate(checkoutSchema), intent);
router.post('/checkout', verifyToken, validate(cartCheckoutSchema), checkout);
router.put('/', verifyToken, confirm);
router.patch('/:id/status', verifyToken, validate(updateStatusSchema), updateStatus);
router.post('/:id/cancel', verifyToken, validate(cancelSchema), cancelOrder);

export default router;
