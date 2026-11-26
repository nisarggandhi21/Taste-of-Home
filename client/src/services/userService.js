import newRequest from '../utils/newRequest';

export const userService = {
  getUser: async (userId) => {
    const res = await newRequest.get(`/users/${userId}`);
    return res.data;
  },
  // Public figures for a seller: member since, items, orders delivered, rating.
  getStats: async (userId) => {
    const res = await newRequest.get(`/users/${userId}/stats`);
    return res.data;
  },
  // The logged-in user's own account, including email and phone.
  getMe: async () => {
    const res = await newRequest.get('/users/me');
    return res.data;
  },
  // changes: { img, location, phone, desc }
  updateMe: async (changes) => {
    const res = await newRequest.patch('/users/me', changes);
    return res.data;
  },
  getFavourites: async () => {
    const res = await newRequest.get('/users/me/favourites');
    return res.data;
  },
  addFavourite: async (itemId) => {
    const res = await newRequest.put(`/users/me/favourites/${itemId}`);
    return res.data;
  },
  removeFavourite: async (itemId) => {
    const res = await newRequest.delete(`/users/me/favourites/${itemId}`);
    return res.data;
  },
};
