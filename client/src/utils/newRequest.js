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
    const errorMessage =
      error.response?.data?.message || error.response?.data || 'Something went wrong!';
    toast.error(errorMessage);

    if (error.response?.status === 401) {
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }

    return Promise.reject(error);
  }
);

export default newRequest;
