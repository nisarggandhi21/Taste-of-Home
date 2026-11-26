import rateLimit from 'express-rate-limit';

const limiter = ({ windowMs, limit, message, ...options }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, status: 429, message },
    ...options,
  });

// Counts failed attempts only, so normal use never hits the limit.
export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many failed login attempts. Please try again in 15 minutes.',
});

export const registerLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many accounts created from this address. Please try again later.',
});

// Covers every request that makes the server send an email.
export const emailLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many email requests. Please try again in an hour.',
});

export const passwordLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many attempts. Please try again in 15 minutes.',
});

export const uploadLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: 'Too many uploads. Please try again later.',
});
