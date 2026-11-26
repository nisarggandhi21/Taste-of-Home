import newRequest from '../utils/newRequest';

export const orderService = {
  getOrders: async () => {
    const res = await newRequest.get('/orders');
    return res.data;
  },
  // checkout: { quantity, deliveryAddress }
  createPaymentIntent: async (id, checkout) => {
    const res = await newRequest.post(`/orders/create-payment-intent/${id}`, checkout);
    return res.data;
  },
  confirmOrder: async (payment_intent) => {
    const res = await newRequest.put('/orders', { payment_intent });
    return res.data;
  },
  // Seller totals: { earned, inProgress, delivered, active, cancelled, topItems }
  getSummary: async () => {
    const res = await newRequest.get('/orders/summary');
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await newRequest.patch(`/orders/${id}/status`, { status });
    return res.data;
  },
  cancelOrder: async (id, reason) => {
    const res = await newRequest.post(`/orders/${id}/cancel`, { reason });
    return res.data;
  },
};
