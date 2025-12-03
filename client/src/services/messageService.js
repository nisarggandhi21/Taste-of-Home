import newRequest from '../utils/newRequest';

export const messageService = {
  getMessages: async (id) => {
    const res = await newRequest.get(`/messages/${id}`);
    return res.data;
  },
  sendMessage: async (messageData) => {
    const res = await newRequest.post('/messages', messageData);
    return res.data;
  },
};
