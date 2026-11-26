import Item from '../models/item.model.js';
import { itemsQuerySchema } from '../schemas/item.schema.js';
import createError from '../utils/createError.js';
import { verifyAccessToken } from '../utils/token.js';

// Search text is matched literally, never interpreted as a regular expression.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createItem = async (req, res, next) => {
  if (!req.isSeller) return next(createError(403, 'You are not a seller'));

  // req.body has been reduced to the validated fields; the owner always comes from the token.
  const newItem = new Item({
    ...req.body,
    userId: req.userId,
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
    if (!item) return next(createError(404, 'Item not found!'));
    if (item.userId !== req.userId) {
      return next(createError(403, 'You can delete only your item'));
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
    if (!item) return next(createError(404, 'Item not found!'));
    res.status(200).send(item);
  } catch (error) {
    next(error);
  }
};

export const getItems = async (req, res, next) => {
  const parsed = itemsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return next(createError(400, parsed.error.issues.map((issue) => issue.message).join(', ')));
  }
  const q = parsed.data;

  const token = req.cookies.accessToken;
  let currentUserId = null;

  if (token) {
    try {
      currentUserId = verifyAccessToken(token).id;
    } catch {
      // Ignore invalid token for getItems
    }
  }

  const filters = {
    ...(q.userId && { userId: q.userId }),
    ...(q.cat && { cat: { $regex: escapeRegex(q.cat), $options: 'i' } }),
    ...((q.min !== undefined || q.max !== undefined) && {
      price: {
        ...(q.min !== undefined && { $gt: q.min }),
        ...(q.max !== undefined && { $lt: q.max }),
      },
    }),
    ...(q.search && { title: { $regex: escapeRegex(q.search), $options: 'i' } }),
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
