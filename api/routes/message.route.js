import express from 'express';
import { verifyToken } from '../middleware/jwt.js';
import { createMessage, getMessages, streamMessages } from '../controllers/message.controller.js';
const router = express.Router();

router.post('/', verifyToken, createMessage);
// Before the next route, so that "stream" is not read as a conversation id.
router.get('/stream', verifyToken, streamMessages);
router.get('/:id', verifyToken, getMessages);

export default router;
