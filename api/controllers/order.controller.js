import Order from "../models/order.model.js";
import createError from "../utils/createError.js";
import Item from "../models/item.model.js";

export const createOrder = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.itemId);

    const newOrder = new Order({
      itemId: item._id,
      img: item.cover,
      title: item.title,
      buyerId: req.userId,
      sellerId: item.userId,
      price: item.price,
      payment_intent: "temporary",
    });

    await newOrder.save();
    res.status(200).send("Successfull");
  } catch (error) {
    next(error);
  }
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
