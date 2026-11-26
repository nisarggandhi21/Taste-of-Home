import Item from '../models/item.model.js';
import { deleteItemsAndTheirTraces } from '../utils/cleanup.js';
import User from '../models/user.model.js';
import { itemsQuerySchema } from '../schemas/item.schema.js';
import createError from '../utils/createError.js';
import { readUser } from '../middleware/jwt.js';

// The id is a tie-breaker so that pages never overlap.
const SORTS = {
  sales: { sales: -1, _id: 1 },
  createdAt: { createdAt: -1, _id: 1 },
  rating: { rating: -1, starNumber: -1, _id: 1 },
  price: { price: -1, _id: 1 },
  priceAsc: { price: 1, _id: 1 },
};

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
    res.status(200).json(await item.save());
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
  const q = parsed.data;

  const currentUserId = readUser(req)?.id;

  try {
    const userId = {};
    if (q.userId) userId.$eq = q.userId;
    // Your own items are left out of general browsing.
    else if (currentUserId) userId.$ne = currentUserId;

    if (q.location) {
      // Items carry no location of their own; they are where their seller is.
      const sellers = await User.find({
        location: { $regex: escapeRegex(q.location), $options: 'i' },
      }).distinct('_id');
      userId.$in = sellers.map(String);
    }

    const filters = {
      ...(Object.keys(userId).length && { userId }),
      ...(q.cat && { cat: { $regex: escapeRegex(q.cat), $options: 'i' } }),
      ...((q.min !== undefined || q.max !== undefined) && {
        price: {
          ...(q.min !== undefined && { $gt: q.min }),
          ...(q.max !== undefined && { $lt: q.max }),
        },
      }),
      ...(q.search && { title: { $regex: escapeRegex(q.search), $options: 'i' } }),
      // Paused items are only listed for their owner.
      ...(!(q.userId && q.userId === currentUserId) && { isAvailable: { $ne: false } }),
      ...(q.diet && { diet: q.diet }),
      // Items without declared allergens never count as free from anything.
      ...(q.freeFrom?.length && { allergens: { $exists: true, $nin: q.freeFrom } }),
    };

    const [result] = await Item.aggregate([
      { $match: filters },
      {
        $addFields: {
          rating: {
            $cond: [{ $gt: ['$starNumber', 0] }, { $divide: ['$totalStars', '$starNumber'] }, 0],
          },
        },
      },
      { $sort: SORTS[q.sort] },
      {
        $facet: {
          items: [{ $skip: (q.page - 1) * q.limit }, { $limit: q.limit }],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.total[0]?.count || 0;
    res.status(200).send({
      items: result.items,
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / q.limit)),
    });
  } catch (error) {
    next(error);
  }
};
