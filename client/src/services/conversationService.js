import newRequest from "../utils/newRequest";

export const conversationService = {
  getConversations: async () => {
    const res = await newRequest.get("/conversations");
    return res.data;
  },
  getSingleConversation: async (id) => {
    const res = await newRequest.get(`/conversations/single/${id}`);
    return res.data;
  },
  createConversation: async (data) => {
    const res = await newRequest.post("/conversations/", data);
    return res.data;
  },
  markAsRead: async (id) => {
    const res = await newRequest.put(`/conversations/${id}`);
    return res.data;
  },
};
