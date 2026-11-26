import Stripe from 'stripe';
import Item from '../models/item.model.js';
import Order from '../models/order.model.js';
import createError from '../utils/createError.js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

// Orders created before `isPaid` existed used `isCompleted` to mean "paid".
const PAID_FILTER = {
  $or: [{ isPaid: true }, { isPaid: { $exists: false }, isCompleted: true }],
};

// Idempotent: only the first call for a payment intent changes anything.
const markOrderPaid = async (paymentIntentId) => {
  const order = await Order.findOneAndUpdate(
    { payment_intent: paymentIntentId, isPaid: { $ne: true } },
    { $set: { isPaid: true } },
    { new: true }
  );
  if (order) {
    await Item.findByIdAndUpdate(order.itemId, { $inc: { sales: 1 } });
  }
  return order;
};

export const intent = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return next(createError(404, 'Item not found!'));

    const paymentIntent = await getStripe().paymentIntents.create({
      // Stripe expects the smallest currency unit (paise), prices are stored in rupees.
      amount: Math.round(item.price * 100),
      currency: 'inr',
      description: item.title,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    const newOrder = new Order({
      itemId: item._id,
      img: item.cover,
      title: item.title,
      buyerId: req.userId,
      sellerId: item.userId,
      price: item.price,
      payment_intent: paymentIntent.id,
    });
    await newOrder.save();
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    // Unpaid orders are abandoned checkouts and are not shown to either side.
    const orders = await Order.find({
      $and: [{ $or: [{ buyerId: req.userId }, { sellerId: req.userId }] }, PAID_FILTER],
    }).sort({ createdAt: -1 });

    res.status(200).send(orders);
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

export const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(createError(404, 'Order not found!'));

    if (order.sellerId !== req.userId) {
      return next(createError(403, 'You can only complete your own orders!'));
    }
    if (!order.isPaid && !order.isCompleted) {
      return next(createError(400, 'This order has not been paid yet.'));
    }

    await Order.findByIdAndUpdate(req.params.id, {
      $set: {
        isCompleted: true,
      },
    });

    res.status(200).send('Order has been marked as completed.');
  } catch (err) {
    next(err);
  }
};
