import Item from '../models/item.model.js';
import { deleteItemsAndTheirTraces } from '../utils/cleanup.js';
import { itemsQuerySchema } from '../schemas/item.schema.js';
import createError from '../utils/createError.js';
import { readUser } from '../middleware/jwt.js';
import { embedItem } from '../ai/embeddings.js';
import { searchItems } from '../services/itemSearch.js';

export const createItem = async (req, res, next) => {
  if (!req.isSeller) return next(createError(403, 'You are not a seller'));

  // req.body has been reduced to the validated fields; the owner always comes from the token.
  const newItem = new Item({
    ...req.body,
    userId: req.userId,
  });

  try {
    const savedItem = await newItem.save();
    // Makes the dish findable by meaning; a failure here never blocks the save.
    await embedItem(savedItem);
    res.status(201).json(savedItem);
  } catch (error) {
    next(error);
  }
};

// Loads an item and makes sure the logged-in user owns it.
const findOwnItem = async (req) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw createError(404, 'Item not found!');
  if (item.userId !== req.userId) throw createError(403, 'You can change only your own items');
  return item;
};

export const updateItem = async (req, res, next) => {
  try {
    const item = await findOwnItem(req);
    // req.body has been reduced to the validated, seller-editable fields.
    item.set(req.body);
    const saved = await item.save();
    await embedItem(saved);
    res.status(200).json(saved);
  } catch (error) {
    next(error);
  }
};

export const setAvailability = async (req, res, next) => {
  try {
    const item = await findOwnItem(req);
    item.isAvailable = req.body.isAvailable;
    res.status(200).json(await item.save());
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

    await deleteItemsAndTheirTraces([item._id]);
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

  try {
    res.status(200).send(await searchItems(parsed.data, { currentUserId: readUser(req)?.id }));
  } catch (error) {
    next(error);
  }
};
