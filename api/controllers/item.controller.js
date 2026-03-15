import Item from '../models/item.model.js';
import createError from '../utils/createError.js';
import jwt from 'jsonwebtoken';

export const createItem = async (req, res, next) => {
  if (!req.isSeller) return next(createError('You are not a seller', 403));

  const newItem = new Item({
    userId: req.userId,
    ...req.body,
  });

  try {
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (item.userId !== req.userId) {
      return next(createError('You can delete only your item', 403));
    }

    await Item.findByIdAndDelete(req.params.id);
    res.status(200).send('deleted');
  } catch (error) {
    next(error);
  }
};

export const getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) next(createError(404, 'Item not found!'));
    res.status(200).send(item);
  } catch (error) {
    next(error);
  }
};

export const getItems = async (req, res, next) => {
  const q = req.query;

  const token = req.cookies.accessToken;
  let currentUserId = null;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_KEY);
      currentUserId = payload.id;
    } catch (err) {
      // Ignore invalid token for getItems
    }
  }

  const filters = {
    ...(q.userId && { userId: q.userId }),
    ...(q.cat && { cat: { $regex: q.cat, $options: 'i' } }),
    ...((q.min || q.max) && {
      price: {
        ...(q.min && { $gt: q.min }),
        ...(q.max && { $lt: q.max }),
      },
    }),
    ...(q.search && { title: { $regex: q.search, $options: 'i' } }),
    // Filter out the current user's items if they are searching and not specifically looking for their own items
    ...(currentUserId && !q.userId && { userId: { $ne: currentUserId } }),
  };

  try {
    const items = await Item.find(filters).sort({ [q.sort]: -1 });
    res.status(200).send(items);
  } catch (error) {
    next(error);
  }
};
