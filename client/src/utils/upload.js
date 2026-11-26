import axios from 'axios';
import { toast } from 'react-toastify';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dcumlh41c';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'taste-of-home';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// These checks give quick feedback only. The same limits must also be set on the upload
// preset in Cloudinary, because anything running in the browser can be bypassed.
const validate = (file) => {
  if (!file) return 'Please choose an image first.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG or WebP images can be uploaded.';
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `Images must be smaller than ${MAX_SIZE_MB} MB.`;
  return null;
};

const upload = async (file) => {
  const problem = validate(file);
  if (problem) {
    toast.error(problem);
    throw new Error(problem);
  }

  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', UPLOAD_PRESET);

  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      data
    );

    return res.data.secure_url;
  } catch (err) {
    toast.error('Image upload failed!');
    throw err;
  }
};

export default upload;
