import express from 'express';
import {
  createItem,
  deleteItem,
  getItem,
  getItems,
  setAvailability,
  updateItem,
} from '../controllers/item.controller.js';
import { verifyToken } from '../middleware/jwt.js';
import validate from '../middleware/validate.js';
import { availabilitySchema, createItemSchema } from '../schemas/item.schema.js';

const router = express.Router();

router.post('/', verifyToken, validate(createItemSchema), createItem);
router.put('/:id', verifyToken, validate(createItemSchema), updateItem);
router.patch('/:id/availability', verifyToken, validate(availabilitySchema), setAvailability);
router.delete('/:id', verifyToken, deleteItem);
router.get('/single/:id', getItem);
router.get('/', getItems);

export default router;
