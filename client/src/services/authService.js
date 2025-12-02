import newRequest from "../utils/newRequest";

export const authService = {
  login: async (credentials) => {
    const res = await newRequest.post("/auth/login", credentials);
    return res.data;
  },
  register: async (userData) => {
    const res = await newRequest.post("/auth/register", userData);
    return res.data;
  },
  logout: async () => {
    const res = await newRequest.post("/auth/logout");
    return res.data;
  },
};
