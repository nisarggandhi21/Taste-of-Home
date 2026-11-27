import newRequest from '../utils/newRequest';

const get = async (path, params) => (await newRequest.get(`/admin/${path}`, { params })).data;
const post = async (path, body) => (await newRequest.post(`/admin/${path}`, body)).data;

// For administrators only; the API answers "not found" to everybody else.
// Lists take { search, state, page } and resolve to { rows, total, page, pages }.
export const adminService = {
  getOverview: () => get('overview'),
  getActions: (params) => get('actions', params),

  getUsers: (params) => get('users', params),
  suspendUser: (id, reason) => post(`users/${id}/suspend`, { reason }),
  unsuspendUser: (id) => post(`users/${id}/unsuspend`),

  getItems: (params) => get('items', params),
  takeDownItem: (id, reason) => post(`items/${id}/takedown`, { reason }),
  restoreItem: (id) => post(`items/${id}/restore`),

  getOrders: (params) => get('orders', params),
  refundOrder: (id, reason) => post(`orders/${id}/refund`, { reason }),
};
