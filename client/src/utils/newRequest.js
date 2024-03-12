import axios from "axios";

const newRequest = axios.create({
  baseURL: "https://taste-of-home-backend.netlify.app/api/",
  withCredentials: true,
});

export default newRequest;
