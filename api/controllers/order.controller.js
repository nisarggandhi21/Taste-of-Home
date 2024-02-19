import Order from "../models/order.model.js";
import createError from "../utils/createError.js";
import Item from "../models/item.model.js";
import Stripe from "stripe";

export const intent = async (req, res, next) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const item = await Item.findById(req.params.id);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: item.price * 100,
    currency: "usd",
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
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      $or: [{ buyerId: req.userId }, { sellerId: req.userId }],
    });

    if (!orders) {
      throw createError(404, "No orders found");
    }
    res.status(200).send(orders);
  } catch (err) {
    next(err);
  }
};

export const confirm = async (req, res, next) => {
  try {
    const orders = await Order.findOneAndUpdate(
      {
        payment_intent: req.body.payment_intent,
      },
      {
        $set: {
          isCompleted: true,
        },
      }
    );

    res.status(200).send("Order has been confirmed.");
  } catch (err) {
    next(err);
  }
};
