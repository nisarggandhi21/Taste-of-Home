import express from 'express';
import { register, login, logout } from '../controllers/auth.controller.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';

const router = express.Router();

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', logout);

export default router;
