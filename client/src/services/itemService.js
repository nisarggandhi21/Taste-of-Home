import newRequest from "../utils/newRequest";

export const itemService = {
  getItems: async (searchParams) => {
    const res = await newRequest.get(`/items${searchParams}`);
    return res.data;
  },
  getSingleItem: async (id) => {
    const res = await newRequest.get(`/items/single/${id}`);
    return res.data;
  },
  createItem: async (itemData) => {
    const res = await newRequest.post("/items/", itemData);
    return res.data;
  },
  deleteItem: async (id) => {
    const res = await newRequest.delete(`/items/${id}`);
    return res.data;
  },
};
