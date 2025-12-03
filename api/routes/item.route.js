import express from 'express';
import { createItem, deleteItem, getItem, getItems } from '../controllers/item.controller.js';
import { verifyToken } from '../middleware/jwt.js';
import validate from '../middleware/validate.js';
import { createItemSchema } from '../schemas/item.schema.js';

const router = express.Router();

router.post('/', verifyToken, validate(createItemSchema), createItem);
router.delete('/:id', verifyToken, deleteItem);
router.get('/single/:id', getItem);
router.get('/', getItems);

export default router;
