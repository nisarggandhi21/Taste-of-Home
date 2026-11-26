import jwt from 'jsonwebtoken';

export const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// SameSite=None because the client and the API are served from different sites.
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'None',
  secure: true,
};

export const signAccessToken = (user) =>
  jwt.sign({ id: user._id, isSeller: user.isSeller }, process.env.JWT_KEY, {
    expiresIn: TOKEN_MAX_AGE_MS / 1000,
  });

// Throws when the token is invalid, expired, or was issued without an expiry.
export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, process.env.JWT_KEY, { algorithms: ['HS256'] });
  if (!payload.exp) throw new Error('Token has no expiry');
  return payload;
};
