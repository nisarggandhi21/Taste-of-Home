import newRequest from '../utils/newRequest';

export const reviewService = {
  getReviews: async (itemId) => {
    const res = await newRequest.get(`/reviews/${itemId}`);
    return res.data;
  },
  createReview: async (reviewData) => {
    const res = await newRequest.post('/reviews', reviewData);
    return res.data;
  },
};
