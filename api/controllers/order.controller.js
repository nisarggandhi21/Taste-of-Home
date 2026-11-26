import Stripe from 'stripe';
import Item from '../models/item.model.js';
import Order, { PAID_ORDER_FILTER, effectiveStatus, nextStage } from '../models/order.model.js';
import createError from '../utils/createError.js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

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

// What the API returns for an order: the stored document plus its worked-out status.
const serialize = (order) => ({ ...order.toObject(), status: effectiveStatus(order) });

const historyEntry = (status) => ({ status, at: new Date() });

// Idempotent: only the first call for a payment intent changes anything.
const markOrderPaid = async (paymentIntentId) => {
  const order = await Order.findOneAndUpdate(
    // Orders from before `isPaid` existed are already complete and are left as they are.
    { payment_intent: paymentIntentId, isPaid: { $ne: true }, isCompleted: { $ne: true } },
    { $set: { isPaid: true, status: 'placed' }, $push: { statusHistory: historyEntry('placed') } },
    { new: true }
  );
  if (order) {
    await Item.findByIdAndUpdate(order.itemId, { $inc: { sales: order.quantity || 1 } });
  }
  return order;
};

export const intent = async (req, res, next) => {
  try {
    const { quantity, deliveryAddress } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) return next(createError(404, 'Item not found!'));
    if (item.userId === req.userId) {
      return next(createError(400, 'You cannot order your own item'));
    }

    const total = item.price * quantity;
    const paymentIntent = await getStripe().paymentIntents.create({
      // Stripe expects the smallest currency unit (paise), prices are stored in rupees.
      amount: Math.round(total * 100),
      currency: 'inr',
      description: quantity > 1 ? `${item.title} x ${quantity}` : item.title,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await new Order({
      itemId: item._id,
      img: item.cover,
      title: item.title,
      buyerId: req.userId,
      sellerId: item.userId,
      unitPrice: item.price,
      quantity,
      price: total,
      deliveryAddress,
      status: 'pending_payment',
      payment_intent: paymentIntent.id,
    }).save();

    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
      total,
    });
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
          cancelledBy: role,
          cancelReason: req.body?.reason || undefined,
          refundId: refund.id,
        },
        $push: { statusHistory: historyEntry('cancelled') },
      },
      { new: true }
    );
    // Only the request that actually cancelled the order takes the sale back.
    if (updated) {
      await Item.findByIdAndUpdate(order.itemId, { $inc: { sales: -(order.quantity || 1) } });
    }

    res.status(200).send(serialize(updated || (await Order.findById(order._id))));
  } catch (err) {
    next(err);
  }
};
