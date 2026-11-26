import Item from '../models/item.model.js';
import Order, { PAID_ORDER_FILTER } from '../models/order.model.js';
import Review from '../models/review.model.js';
import { readUser } from '../middleware/jwt.js';
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

// Voter ids stay private: a review goes out with counts and the visitor's own vote only.
const serialize = (review, userId) => {
  const { helpful, notHelpful, ...rest } = review.toObject();
  return {
    ...rest,
    helpfulCount: helpful.length,
    notHelpfulCount: notHelpful.length,
    myVote: !userId
      ? null
      : helpful.includes(userId)
        ? true
        : notHelpful.includes(userId)
          ? false
          : null,
  };
};

export const getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ itemId: req.params.itemId }).sort({ createdAt: -1 });
    const userId = readUser(req)?.id;
    res.status(200).send(reviews.map((review) => serialize(review, userId)));
  } catch (err) {
    next(err);
  }
};

export const voteReview = async (req, res, next) => {
  try {
    const { helpful } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return next(createError(404, 'Review not found!'));
    if (review.userId === req.userId) {
      return next(createError(400, 'You cannot vote on your own review'));
    }

    // One vote per user: any earlier vote is replaced.
    const update =
      helpful === null
        ? { $pull: { helpful: req.userId, notHelpful: req.userId } }
        : {
            $pull: { [helpful ? 'notHelpful' : 'helpful']: req.userId },
            $addToSet: { [helpful ? 'helpful' : 'notHelpful']: req.userId },
          };
    const updated = await Review.findByIdAndUpdate(review._id, update, { new: true });
    res.status(200).send(serialize(updated, req.userId));
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
