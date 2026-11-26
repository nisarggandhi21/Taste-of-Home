import crypto from 'node:crypto';

// One-time tokens for email links. The link carries the token; only its hash is stored, so a
// copy of the database is not enough to use somebody's link.
export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export const createToken = (lifetimeMs) => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token), expires: new Date(Date.now() + lifetimeMs) };
};
