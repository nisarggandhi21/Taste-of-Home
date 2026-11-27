import axios from 'axios';
import { toast } from 'react-toastify';

const BASEURL = import.meta.env.VITE_BASEURL;
const newRequest = axios.create({
  baseURL: BASEURL,
  withCredentials: true,
});

newRequest.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // The request never got an answer. Several can fail at once; say it once. While
      // offline, a page that cannot load says so itself, and the banner is already showing.
      const quietRead = !navigator.onLine && error.config?.method === 'get';
      if (quietRead) return Promise.reject(error);
      toast.error(
        navigator.onLine
          ? 'Could not reach Taste of Home. Please try again.'
          : 'You are offline. This needs a connection.',
        { toastId: 'no-connection' }
      );
      return Promise.reject(error);
    }

    const errorMessage =
      error.response?.data?.message || error.response?.data || 'Something went wrong!';
    toast.error(errorMessage);

    if (error.response?.status === 401) {
      // The session is gone on the server, so drop the remembered user as well.
      localStorage.removeItem('currentUser');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }

    return Promise.reject(error);
  }
);

export default newRequest;
