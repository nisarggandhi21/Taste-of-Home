import Item from '../models/item.model.js';
import Order, {
  PAID_ORDER_FILTER,
  effectiveStatus,
  nextStage,
  orderLines,
} from '../models/order.model.js';
import {
  cancelAndRefund,
  countSales,
  getStripe,
  historyEntry,
  serialize,
} from '../services/orders.js';
import createError from '../utils/createError.js';
import { notifyOrderPlaced, notifyOrderStatus } from '../utils/orderEmails.js';

const STATUS_LABELS = {
  pending_payment: 'awaiting payment',
  placed: 'placed',
  accepted: 'accepted',
  preparing: 'being prepared',
  out_for_delivery: 'out for delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

// Who may still cancel at which status. Cancelling always refunds the buyer in full.
const CANCELLABLE = {
  buyer: ['placed'],
  seller: ['placed', 'accepted', 'preparing'],
};

// Idempotent: only the first call for a payment intent changes anything.
const markOrderPaid = async (paymentIntentId) => {
  const order = await Order.findOneAndUpdate(
    // Orders from before `isPaid` existed are already complete and are left as they are.
    { payment_intent: paymentIntentId, isPaid: { $ne: true }, isCompleted: { $ne: true } },
    { $set: { isPaid: true, status: 'placed' }, $push: { statusHistory: historyEntry('placed') } },
    { new: true }
  );
  if (order) {
    await countSales(order);
    await notifyOrderPlaced(order);
  }
  return order;
};

// Creates the Stripe payment and the (still unpaid) order for the given dishes.
// `wanted` is [{ itemId, quantity }]; everything else is read from the database, so the
// price a buyer pays never comes from the browser.
const createOrder = async ({ buyerId, wanted, deliveryAddress }) => {
  const items = await Item.find({ _id: { $in: wanted.map((line) => line.itemId) } });
  const byId = new Map(items.map((item) => [String(item._id), item]));

  const lines = wanted.map(({ itemId, quantity }) => {
    const item = byId.get(String(itemId));
    if (!item) throw createError(404, 'Item not found!');
    if (item.userId === buyerId) throw createError(400, 'You cannot order your own item');
    if (item.isAvailable === false) {
      throw createError(400, `${item.title} is not available right now`);
    }
    return {
      itemId: String(item._id),
      title: item.title,
      img: item.cover,
      unitPrice: item.price,
      quantity,
      sellerId: item.userId,
    };
  });

  const sellerId = lines[0].sellerId;
  if (lines.some((line) => line.sellerId !== sellerId)) {
    throw createError(400, 'A cart can only hold dishes from one cook at a time');
  }

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const portions = lines.reduce((sum, line) => sum + line.quantity, 0);
  const describe = (line) => (line.quantity > 1 ? `${line.title} x ${line.quantity}` : line.title);

  const paymentIntent = await getStripe().paymentIntents.create({
    // Stripe expects the smallest currency unit (paise), prices are stored in rupees.
    amount: Math.round(total * 100),
    currency: 'inr',
    description: lines.map(describe).join(', ').slice(0, 500),
    automatic_payment_methods: {
      enabled: true,
    },
  });

  const [first] = lines;
  await new Order({
    lines: lines.map(({ itemId, title, img, unitPrice, quantity }) => ({
      itemId,
      title,
      img,
      unitPrice,
      quantity,
    })),
    // Summary of the whole order (see the model).
    itemId: first.itemId,
    img: first.img,
    title: lines.length === 1 ? first.title : `${first.title} + ${lines.length - 1} more`,
    unitPrice: lines.length === 1 ? first.unitPrice : undefined,
    quantity: portions,
    price: total,
    buyerId,
    sellerId,
    deliveryAddress,
    status: 'pending_payment',
    payment_intent: paymentIntent.id,
  }).save();

  return { clientSecret: paymentIntent.client_secret, total };
};

// Order one dish (named in the URL).
export const intent = async (req, res, next) => {
  try {
    const { quantity, deliveryAddress } = req.body;
    const result = await createOrder({
      buyerId: req.userId,
      wanted: [{ itemId: req.params.id, quantity }],
      deliveryAddress,
    });
    res.status(200).send(result);
  } catch (error) {
    next(error);
  }
};

// Order a cart: several dishes from one cook.
export const checkout = async (req, res, next) => {
  try {
    const { items, deliveryAddress } = req.body;
    const result = await createOrder({ buyerId: req.userId, wanted: items, deliveryAddress });
    res.status(200).send(result);
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    // Unpaid orders are abandoned checkouts and are not shown to either side.
    const orders = await Order.find({
      $and: [{ $or: [{ buyerId: req.userId }, { sellerId: req.userId }] }, PAID_ORDER_FILTER],
    }).sort({ createdAt: -1 });

    res.status(200).send(orders.map(serialize));
  } catch (err) {
    next(err);
  }
};

// What a seller has earned: delivered orders count as earned, paid orders still on their way
// as in progress. Cancelled orders were refunded and count for neither.
export const getSummary = async (req, res, next) => {
  try {
    const orders = await Order.find({ $and: [{ sellerId: req.userId }, PAID_ORDER_FILTER] });

    const summary = { earned: 0, inProgress: 0, delivered: 0, active: 0, cancelled: 0 };
    const byItem = new Map();
    for (const order of orders) {
      const status = effectiveStatus(order);
      if (status === 'cancelled') {
        summary.cancelled += 1;
        continue;
      }
      if (status === 'delivered') {
        summary.earned += order.price;
        summary.delivered += 1;
      } else {
        summary.inProgress += order.price;
        summary.active += 1;
      }
      for (const line of orderLines(order)) {
        const entry = byItem.get(line.itemId) || {
          itemId: line.itemId,
          title: line.title,
          portions: 0,
          total: 0,
        };
        entry.portions += line.quantity;
        entry.total += line.unitPrice * line.quantity;
        byItem.set(line.itemId, entry);
      }
    }

    res.status(200).send({
      ...summary,
      topItems: [...byItem.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
};

// Called by the buyer after Stripe redirects back. The payment state is read from Stripe,
// never trusted from the client.
export const confirm = async (req, res, next) => {
  try {
    const paymentIntentId = req.body.payment_intent;
    if (typeof paymentIntentId !== 'string' || !paymentIntentId) {
      return next(createError(400, 'payment_intent is required'));
    }

    const order = await Order.findOne({ payment_intent: paymentIntentId });
    if (!order) return next(createError(404, 'Order not found!'));
    if (order.buyerId !== req.userId) {
      return next(createError(403, 'You can only confirm your own orders!'));
    }

    if (!order.isPaid) {
      const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return next(createError(402, 'Payment has not been completed.'));
      }
      await markOrderPaid(paymentIntentId);
    }

    res.status(200).send('Order has been confirmed.');
  } catch (err) {
    next(err);
  }
};

// Stripe calls this directly, so an order is marked paid even if the buyer never returns
// to the success page. Requires STRIPE_WEBHOOK_SECRET and the raw request body.
export const stripeWebhook = async (req, res, next) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return next(createError(503, 'Stripe webhook is not configured'));

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch {
    return next(createError(400, 'Invalid Stripe signature'));
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      await markOrderPaid(event.data.object.id);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
};

// The seller moves a paid order forward one stage at a time.
export const updateStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(createError(404, 'Order not found!'));
    if (order.sellerId !== req.userId) {
      return next(createError(403, 'You can only update your own orders!'));
    }

    const current = effectiveStatus(order);
    const target = req.body.status;
    if (nextStage(current) !== target) {
      return next(
        createError(
          400,
          `An order that is ${STATUS_LABELS[current]} cannot be marked as ${STATUS_LABELS[target]}.`
        )
      );
    }

    const updated = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: { status: target, isCompleted: target === 'delivered' },
        $push: { statusHistory: historyEntry(target) },
      },
      { new: true }
    );
    await notifyOrderStatus(updated);
    res.status(200).send(serialize(updated));
  } catch (err) {
    next(err);
  }
};

// Buyer or seller cancels an order; the buyer gets a full refund.
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(createError(404, 'Order not found!'));

    const role =
      order.sellerId === req.userId ? 'seller' : order.buyerId === req.userId ? 'buyer' : null;
    if (!role) return next(createError(403, 'You can only cancel your own orders!'));

    const current = effectiveStatus(order);
    if (!CANCELLABLE[role].includes(current)) {
      return next(
        createError(400, `An order that is ${STATUS_LABELS[current]} can no longer be cancelled.`)
      );
    }

    const cancelled = await cancelAndRefund(order, { by: role, reason: req.body?.reason });
    res.status(200).send(serialize(cancelled));
  } catch (err) {
    next(err);
  }
};
