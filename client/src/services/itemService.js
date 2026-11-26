import newRequest from '../utils/newRequest';

export const itemService = {
  // filters: { cat, search, min, max, diet, freeFrom, location, sort, page, limit, userId }
  // Resolves to { items, total, page, pages }.
  getItems: async (filters = {}) => {
    // Unset filters are left out of the request.
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '' && value != null)
    );
    const res = await newRequest.get('/items', { params });
    return res.data;
  },
  getSingleItem: async (id) => {
    const res = await newRequest.get(`/items/single/${id}`);
    return res.data;
  },
  createItem: async (itemData) => {
    const res = await newRequest.post('/items/', itemData);
    return res.data;
  },
  updateItem: async (id, itemData) => {
    const res = await newRequest.put(`/items/${id}`, itemData);
    return res.data;
  },
  setAvailability: async (id, isAvailable) => {
    const res = await newRequest.patch(`/items/${id}/availability`, { isAvailable });
    return res.data;
  },
  deleteItem: async (id) => {
    const res = await newRequest.delete(`/items/${id}`);
    return res.data;
  },
};
