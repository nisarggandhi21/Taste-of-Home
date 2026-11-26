import createError from '../utils/createError.js';
import { verifyAccessToken } from '../utils/token.js';

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) return next(createError(401, 'You are not authenticated!'));

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.id;
    req.isSeller = payload.isSeller;
    next();
  } catch {
    next(createError(401, 'Your session has expired. Please log in again.'));
  }
};
