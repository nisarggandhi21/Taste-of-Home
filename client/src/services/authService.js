import newRequest from '../utils/newRequest';

export const authService = {
  login: async (credentials) => {
    const res = await newRequest.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData) => {
    const res = await newRequest.post('/auth/register', userData);
    return res.data;
  },
  verifyEmail: async (token) => {
    const res = await newRequest.post('/auth/verify-email', { token });
    return res.data;
  },
  resendVerification: async () => {
    const res = await newRequest.post('/auth/resend-verification');
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await newRequest.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token, password) => {
    const res = await newRequest.post('/auth/reset-password', { token, password });
    return res.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await newRequest.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
  logout: async () => {
    const res = await newRequest.post('/auth/logout');
    return res.data;
  },
};
