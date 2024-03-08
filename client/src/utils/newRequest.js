import axios from "axios";

const newRequest = axios.create({
  baseURL: "https://taste-of-home-aim1.onrender.com/api/",
  withCredentials: true,
});

export default newRequest;
