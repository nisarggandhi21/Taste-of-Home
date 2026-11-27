import User from '../models/user.model.js';
import { isAdminUser } from '../utils/admin.js';
import createError from '../utils/createError.js';
import { verifyAccessToken } from '../utils/token.js';

export const SUSPENDED_MESSAGE =
  'This account has been suspended. Contact us if you think this is a mistake.';

// The account is read on every request, so a session ends the moment the account is
// suspended or deleted, and a change of role applies without logging in again.
export const verifyToken = async (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) return next(createError(401, 'You are not authenticated!'));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(createError(401, 'Your session has expired. Please log in again.'));
  }

  try {
    const user = await User.findById(payload.id).select(
      'username email emailVerified isSeller suspendedAt'
    );
    if (!user) return next(createError(401, 'This account no longer exists.'));
    if (user.suspendedAt) return next(createError(401, SUSPENDED_MESSAGE));

    req.userId = String(user._id);
    req.isSeller = user.isSeller;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Use after verifyToken. Everybody else gets the same answer as for a page that does not
// exist, so the admin API does not advertise itself.
export const verifyAdmin = (req, res, next) => {
  if (!isAdminUser(req.user)) return next(createError(404, 'Not found'));
  next();
};

// For public routes that behave differently for a logged-in visitor.
// Returns the token payload, or null when there is no valid login.
export const readUser = (req) => {
  try {
    return verifyAccessToken(req.cookies.accessToken);
  } catch {
    return null;
  }
};
