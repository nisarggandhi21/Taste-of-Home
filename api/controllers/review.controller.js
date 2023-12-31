import Review from "../models/review.model.js";
import Item from "../models/item.model.js";
import createError from "../utils/createError.js";

export const createReview = async (req, res, next) => {
  if (req.isSeller)
    return next(createError(403, "You are not allowed to create reviews"));

  const newReview = new Review({
    userId: req.userId,
    itemId: req.body.itemId,
    desc: req.body.desc,
    star: req.body.star,
  });

  try {
    const review = await Review.findOne({
      itemId: req.body.itemId,
      userId: req.userId,
    });

    if (review) return next(createError(403, "You already reviewed this item"));
    await Item.findByIdAndUpdate(req.body.itemId, {
      $inc: { totalStars: req.body.star, starNumber: 1 },
    });
    const savedReview = await newReview.save();
    await res.status(201).send(savedReview);
  } catch (err) {
    next(err);
  }
};

export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ itemId: req.params.itemId });
    res.status(200).send(reviews);
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res) => {
  try {
  } catch (err) {
    next(err);
  }
};
