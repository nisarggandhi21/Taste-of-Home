// Order steps that more than one part of the API performs.
import Stripe from 'stripe';
import Item from '../models/item.model.js';
import Order, { effectiveStatus, orderLines } from '../models/order.model.js';
import { notifyOrderCancelled } from '../utils/orderEmails.js';

export const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// What the API returns for an order: the stored document plus its worked-out status.
export const serialize = (order) => ({
  ...order.toObject(),
  status: effectiveStatus(order),
  lines: orderLines(order),
});

// Adds (or with a negative sign, takes back) the sales of every dish on an order.
export const countSales = (order, sign = 1) =>
  Promise.all(
    orderLines(order).map((line) =>
      Item.findByIdAndUpdate(line.itemId, { $inc: { sales: sign * line.quantity } })
    )
  );

export const historyEntry = (status) => ({ status, at: new Date() });

// Refunds the buyer in full and marks the order cancelled. `by` is 'buyer', 'seller' or
// 'admin'. Safe to repeat: only the first call refunds, takes the sale back and sends emails.
// Resolves to the order as it is afterwards.
export const cancelAndRefund = async (order, { by, reason }) => {
  // The idempotency key makes a repeated request return the same refund instead of a new one.
  const refund = await getStripe().refunds.create(
    { payment_intent: order.payment_intent },
    { idempotencyKey: `refund_${order._id}` }
  );

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: { $ne: 'cancelled' } },
    {
      $set: {
        status: 'cancelled',
        cancelledBy: by,
        cancelReason: reason || undefined,
        refundId: refund.id,
      },
      $push: { statusHistory: historyEntry('cancelled') },
    },
    { new: true }
  );
  if (updated) {
    await countSales(order, -1);
    await notifyOrderCancelled(updated);
  }
  return updated || (await Order.findById(order._id));
};
