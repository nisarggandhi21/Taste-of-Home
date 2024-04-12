import axios from "axios";

const newRequest = axios.create({
  baseURL: "hhttps://taste-of-home-1.onrender.com/api/",
  withCredentials: true,
});

export default newRequest;
