import crypto from 'node:crypto';
import createError from '../utils/createError.js';

// What every signed upload is limited to. These values are part of the signature, so the
// browser cannot change them.
const UPLOAD_PARAMS = {
  allowed_formats: 'jpg,jpeg,png,webp',
  folder: 'taste-of-home',
};

// Cloudinary's rule: sort the signed fields by name, join them as name=value with "&",
// append the API secret and take the SHA-1 hex digest.
export const signUpload = (params, apiSecret) => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');
};

// Hands the browser a short-lived signature so it can upload one image straight to Cloudinary.
// The API secret never leaves the server. Signatures are valid for one hour.
export const getUploadSignature = (req, res, next) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    // The client falls back to its unsigned upload preset.
    return next(createError(503, 'Signed uploads are not configured'));
  }

  const params = { ...UPLOAD_PARAMS, timestamp: Math.round(Date.now() / 1000) };
  res.status(200).send({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    params,
    signature: signUpload(params, CLOUDINARY_API_SECRET),
  });
};
