import newRequest from "../utils/newRequest";

export const orderService = {
  getOrders: async () => {
    const res = await newRequest.get("/orders");
    return res.data;
  },
  createPaymentIntent: async (id) => {
    const res = await newRequest.post(`/orders/create-payment-intent/${id}`);
    return res.data;
  },
  confirmOrder: async (payment_intent) => {
    const res = await newRequest.put("/orders", { payment_intent });
    return res.data;
  },
};
