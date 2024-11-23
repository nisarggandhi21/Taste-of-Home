import axios from "axios";
import { useNavigate } from "react-router-dom";

const BASEURL = import.meta.env.BASEURL;
const newRequest = axios.create({
  baseURL: BASEURL,
  withCredentials: true,
});

newRequest.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default newRequest;
