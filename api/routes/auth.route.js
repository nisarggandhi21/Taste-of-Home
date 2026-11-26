import express from 'express';
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/jwt.js';
import {
  emailLimiter,
  loginLimiter,
  passwordLimiter,
  registerLimiter,
} from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schemas/auth.schema.js';

const router = express.Router();

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', logout);

router.post('/verify-email', passwordLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', verifyToken, emailLimiter, resendVerification);
router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordLimiter, validate(resetPasswordSchema), resetPassword);
router.post(
  '/change-password',
  verifyToken,
  passwordLimiter,
  validate(changePasswordSchema),
  changePassword
);

export default router;
