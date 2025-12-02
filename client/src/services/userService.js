import newRequest from "../utils/newRequest";

export const userService = {
  getUser: async (userId) => {
    const res = await newRequest.get(`/users/${userId}`);
    return res.data;
  },
};
