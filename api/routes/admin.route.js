import express from 'express';
import {
  getOverview,
  listActions,
  listItems,
  listOrders,
  listUsers,
  refundOrder,
  restoreItem,
  suspendUser,
  takeDownItem,
  unsuspendUser,
} from '../controllers/admin.controller.js';
import { verifyAdmin, verifyToken } from '../middleware/jwt.js';
import validate from '../middleware/validate.js';
import { idSchema, reasonSchema } from '../schemas/admin.schema.js';

const router = express.Router();

// Everything here is for administrators only (see utils/admin.js).
router.use(verifyToken, verifyAdmin);

router.get('/overview', getOverview);
router.get('/actions', listActions);

router.get('/users', listUsers);
router.post('/users/:id/suspend', validate(reasonSchema), suspendUser);
router.post('/users/:id/unsuspend', validate(idSchema), unsuspendUser);

router.get('/items', listItems);
router.post('/items/:id/takedown', validate(reasonSchema), takeDownItem);
router.post('/items/:id/restore', validate(idSchema), restoreItem);

router.get('/orders', listOrders);
router.post('/orders/:id/refund', validate(reasonSchema), refundOrder);

export default router;
