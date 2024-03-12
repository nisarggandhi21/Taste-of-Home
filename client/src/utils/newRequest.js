import axios from "axios";

const newRequest = axios.create({
  baseURL: "https://taste-of-home-flame.vercel.app/api/",
  withCredentials: true,
});

export default newRequest;
