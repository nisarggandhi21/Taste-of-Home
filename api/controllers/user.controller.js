import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Item from '../models/item.model.js';
import Order from '../models/order.model.js';
import User, { ownProfile } from '../models/user.model.js';
import { deleteUserAndTheirTraces } from '../utils/cleanup.js';
import createError from '../utils/createError.js';
import { cookieOptions } from '../utils/token.js';

// Deleting an account is permanent, so it asks for the password again and is refused while
// the user still has orders on their way, as buyer or as seller.
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(createError(404, 'User not found!'));

    if (req.userId !== user._id.toString()) {
      return next(createError(403, 'You can delete only your account!'));
    }

    const password = req.body?.password;
    if (typeof password !== 'string' || !(await bcrypt.compare(password, user.password))) {
      return next(createError(400, 'Your password is not correct.'));
    }

    const openOrders = await Order.countDocuments({
      $or: [{ buyerId: req.userId }, { sellerId: req.userId }],
      isPaid: true,
      isCompleted: { $ne: true },
      status: { $ne: 'cancelled' },
    });
    if (openOrders > 0) {
      return next(
        createError(
          409,
          `You still have ${openOrders} open order${openOrders === 1 ? '' : 's'}. Complete or cancel them before deleting your account.`
        )
      );
    }

    await deleteUserAndTheirTraces(user._id);
    res.clearCookie('accessToken', cookieOptions).status(200).send('deleted');
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    // Public profile only: never expose the password hash or contact details.
    const user = await User.findById(req.params.id).select(
      'username img location desc isSeller createdAt'
    );
    if (!user) {
      return next(createError(404, 'User not found!'));
    }
    res.status(200).send(user);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return next(createError(404, 'User not found!'));
    res.status(200).send(ownProfile(user));
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    // req.body has been reduced to the fields a user may change about themselves.
    const user = await User.findByIdAndUpdate(req.userId, { $set: req.body }, { new: true });
    if (!user) return next(createError(404, 'User not found!'));
    res.status(200).send(ownProfile(user));
  } catch (error) {
    next(error);
  }
};

// Public figures shown on a seller's items, all worked out from real records.
export const getSellerStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('createdAt');
    if (!user) return next(createError(404, 'User not found!'));

    const sellerId = String(user._id);
    const [items, delivered, lastDelivered] = await Promise.all([
      Item.find({ userId: sellerId, isAvailable: { $ne: false } }).select('totalStars starNumber'),
      Order.countDocuments({ sellerId, isCompleted: true }),
      Order.findOne({ sellerId, isCompleted: true }).sort({ updatedAt: -1 }).select('updatedAt'),
    ]);
    const reviews = items.reduce((sum, item) => sum + item.starNumber, 0);
    const stars = items.reduce((sum, item) => sum + item.totalStars, 0);

    res.status(200).send({
      memberSince: user.createdAt,
      items: items.length,
      ordersDelivered: delivered,
      lastDeliveryAt: lastDelivered?.updatedAt || null,
      reviews,
      rating: reviews > 0 ? Math.round((stars / reviews) * 10) / 10 : null,
    });
  } catch (error) {
    next(error);
  }
};

export const getFavourites = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('favourites');
    if (!user) return next(createError(404, 'User not found!'));

    // Saved items that have since been deleted are simply left out.
    const ids = user.favourites.filter((id) => mongoose.isValidObjectId(id));
    const items = await Item.find({ _id: { $in: ids } });
    res.status(200).send(items);
  } catch (error) {
    next(error);
  }
};

const changeFavourite = (operator) => async (req, res, next) => {
  try {
    const itemId = req.params.itemId;
    if (!mongoose.isValidObjectId(itemId) || !(await Item.exists({ _id: itemId }))) {
      return next(createError(404, 'Item not found!'));
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { [operator]: { favourites: itemId } },
      { new: true }
    ).select('favourites');
    res.status(200).send(user.favourites);
  } catch (error) {
    next(error);
  }
};

export const addFavourite = changeFavourite('$addToSet');
export const removeFavourite = changeFavourite('$pull');
