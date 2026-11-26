import axios from 'axios';
import newRequest from '../utils/newRequest';

export const aiService = {
  // { enabled }. Asked without the shared error handling: when it fails, AI is simply off.
  getStatus: async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BASEURL}ai/status`);
      return res.data;
    } catch {
      return { enabled: false };
    }
  },
  // Drafts listing fields from an uploaded photo.
  draftListing: async (imageUrl) => {
    const res = await newRequest.post('/ai/listing-draft', { imageUrl });
    return res.data;
  },
  // messages: [{ role: 'user' | 'assistant', text }]. Resolves to { reply, items }.
  ask: async (messages) => {
    const res = await newRequest.post('/ai/assistant', { messages });
    return res.data;
  },
  // { text, pros, cons, reviewCount } or null.
  getReviewSummary: async (itemId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BASEURL}ai/review-summary/${itemId}`);
      return res.data.summary;
    } catch {
      return null;
    }
  },
};
