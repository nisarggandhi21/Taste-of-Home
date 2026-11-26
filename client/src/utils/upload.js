import axios from 'axios';
import { toast } from 'react-toastify';

// Used only when the API has no Cloudinary credentials (see getSignature below).
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dcumlh41c';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'taste-of-home';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// These checks give quick feedback only; anything running in the browser can be bypassed.
// With signed uploads the allowed formats are enforced by Cloudinary as well.
const validate = (file) => {
  if (!file) return 'Please choose an image first.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG or WebP images can be uploaded.';
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `Images must be smaller than ${MAX_SIZE_MB} MB.`;
  return null;
};

// Asks the API to sign this upload. Resolves to null when the API has no Cloudinary
// credentials (or cannot be reached), in which case the unsigned preset is used instead.
const getSignature = async () => {
  try {
    const res = await axios.post(`${import.meta.env.VITE_BASEURL}uploads/signature`);
    return res.data;
  } catch {
    return null;
  }
};

const upload = async (file) => {
  const problem = validate(file);
  if (problem) {
    toast.error(problem);
    throw new Error(problem);
  }

  const signed = await getSignature();
  const data = new FormData();
  data.append('file', file);
  if (signed) {
    data.append('api_key', signed.apiKey);
    data.append('signature', signed.signature);
    // The signed fields must be sent exactly as the server signed them.
    for (const [name, value] of Object.entries(signed.params)) data.append(name, value);
  } else {
    data.append('upload_preset', UPLOAD_PRESET);
  }

  try {
    const cloudName = signed ? signed.cloudName : CLOUD_NAME;
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, data);

    return res.data.secure_url;
  } catch (err) {
    toast.error('Image upload failed!');
    throw err;
  }
};

export default upload;
