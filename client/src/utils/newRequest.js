import axios from "axios";

const BASEURL = import.meta.env.VITE_BASEURL;
const newRequest = axios.create({
  // baseURL: "https://taste-of-home-1.onrender.com/api/",

  baseURL: BASEURL,
  withCredentials: true,
});

export default newRequest;
