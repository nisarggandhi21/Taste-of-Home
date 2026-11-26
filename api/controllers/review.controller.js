import Item from '../models/item.model.js';
import Order, { PAID_ORDER_FILTER } from '../models/order.model.js';
import Review from '../models/review.model.js';
import createError from '../utils/createError.js';

export const createReview = async (req, res, next) => {
  if (req.isSeller) return next(createError(403, 'You are not allowed to create reviews'));

  const { itemId, desc, star } = req.body;

  try {
    if (!(await Item.exists({ _id: itemId }))) return next(createError(404, 'Item not found!'));

    // Only buyers with a paid order for this item that was not cancelled can review it.
    const hasOrdered = await Order.exists({
      $and: [{ itemId, buyerId: req.userId, status: { $ne: 'cancelled' } }, PAID_ORDER_FILTER],
    });
    if (!hasOrdered) {
      return next(createError(403, 'You can only review items you have ordered'));
    }

    const review = await Review.findOne({ itemId, userId: req.userId });
    if (review) return next(createError(403, 'You already reviewed this item'));

    await Item.findByIdAndUpdate(itemId, {
      $inc: { totalStars: star, starNumber: 1 },
    });
    const savedReview = await new Review({ userId: req.userId, itemId, desc, star }).save();
    res.status(201).send(savedReview);
  } catch (err) {
    next(err);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ itemId: req.params.itemId });
    res.status(200).send(reviews);
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return next(createError(404, 'Review not found!'));
    if (review.userId !== req.userId) {
      return next(createError(403, 'You can delete only your review!'));
    }

    await Review.findByIdAndDelete(req.params.id);
    await Item.findByIdAndUpdate(review.itemId, {
      $inc: { totalStars: -review.star, starNumber: -1 },
    });
    res.status(200).send('Review has been deleted.');
  } catch (err) {
    next(err);
  }
};
