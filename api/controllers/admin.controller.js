// What an administrator can do: look at users, listings and orders, suspend an account,
// take a listing down, and refund an order. Every change is recorded with a reason.
import AdminAction from '../models/adminAction.model.js';
import Item from '../models/item.model.js';
import Order, {
  ORDER_STATUSES,
  PAID_ORDER_FILTER,
  effectiveStatus,
} from '../models/order.model.js';
import User from '../models/user.model.js';
import { listQuerySchema } from '../schemas/admin.schema.js';
import { escapeRegex } from '../services/itemSearch.js';
import { cancelAndRefund, serialize } from '../services/orders.js';
import { isAdminUser } from '../utils/admin.js';
import createError from '../utils/createError.js';
import { clientUrl, trySendMail } from '../utils/mailer.js';
import { orderRef } from '../utils/orderEmails.js';

const PAGE_SIZE = 20;
const OPEN_STATUSES = ['placed', 'accepted', 'preparing', 'out_for_delivery'];

const parseQuery = (req) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw createError(400, 'That search is not valid');
  return parsed.data;
};

const paged = (rows, total, page) => ({
  rows,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
});

const record = (req, action, targetId, targetLabel, reason) =>
  AdminAction.create({
    adminId: req.userId,
    adminName: req.user.username,
    action,
    targetId: String(targetId),
    targetLabel,
    reason,
  });

// Usernames for a list of user ids, as a Map.
const namesOf = async (ids) => {
  const users = await User.find({ _id: { $in: [...new Set(ids)] } }).select('username');
  return new Map(users.map((user) => [String(user._id), user.username]));
};

// The status of an order as a database expression, for orders old and new.
const STATUS_EXPRESSION = {
  $ifNull: ['$status', { $cond: ['$isCompleted', 'delivered', 'placed'] }],
};

export const getOverview = async (req, res, next) => {
  try {
    const [users, sellers, suspended, listings, takenDown, byStatus, recent] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSeller: true }),
      User.countDocuments({ suspendedAt: { $exists: true } }),
      Item.countDocuments({ isAvailable: { $ne: false } }),
      Item.countDocuments({ takenDownAt: { $exists: true } }),
      Order.aggregate([
        { $match: PAID_ORDER_FILTER },
        { $group: { _id: STATUS_EXPRESSION, count: { $sum: 1 }, total: { $sum: '$price' } } },
      ]),
      AdminAction.find().sort({ createdAt: -1, _id: -1 }).limit(5),
    ]);

    const orders = { open: 0, delivered: 0, cancelled: 0, paid: 0, refunded: 0 };
    for (const group of byStatus) {
      if (group._id === 'cancelled') {
        orders.cancelled += group.count;
        orders.refunded += group.total;
      } else {
        orders.paid += group.total;
        if (group._id === 'delivered') orders.delivered += group.count;
        else orders.open += group.count;
      }
    }

    res.status(200).send({ users, sellers, suspended, listings, takenDown, orders, recent });
  } catch (err) {
    next(err);
  }
};

const userRow = (user, counts = {}) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  emailVerified: user.emailVerified,
  isSeller: user.isSeller,
  isAdmin: isAdminUser(user),
  location: user.location,
  createdAt: user.createdAt,
  suspendedAt: user.suspendedAt,
  suspendReason: user.suspendReason,
  listings: counts.listings || 0,
  openOrders: counts.openOrders || 0,
});

const openOrdersFilter = (sellerIds) => ({
  sellerId: { $in: sellerIds },
  isPaid: true,
  isCompleted: { $ne: true },
  status: { $ne: 'cancelled' },
});

export const listUsers = async (req, res, next) => {
  try {
    const { search, page, state } = parseQuery(req);
    const filter = {
      ...(search && {
        $or: [
          { username: { $regex: escapeRegex(search), $options: 'i' } },
          { email: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      }),
      ...(state === 'suspended' && { suspendedAt: { $exists: true } }),
      ...(state === 'sellers' && { isSeller: true }),
    };

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1, _id: 1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      User.countDocuments(filter),
    ]);
    const ids = users.map((user) => String(user._id));
    const [listings, openOrders] = await Promise.all([
      Item.aggregate([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: openOrdersFilter(ids) },
        { $group: { _id: '$sellerId', count: { $sum: 1 } } },
      ]),
    ]);
    const listingCount = new Map(listings.map((row) => [row._id, row.count]));
    const openCount = new Map(openOrders.map((row) => [row._id, row.count]));

    res.status(200).send(
      paged(
        users.map((user) =>
          userRow(user, {
            listings: listingCount.get(String(user._id)),
            openOrders: openCount.get(String(user._id)),
          })
        ),
        total,
        page
      )
    );
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(createError(404, 'User not found!'));
    if (isAdminUser(user)) return next(createError(400, 'An administrator cannot be suspended.'));
    if (user.suspendedAt) return next(createError(409, 'This account is already suspended.'));

    user.suspendedAt = new Date();
    user.suspendReason = req.body.reason;
    await user.save();
    // Their listings disappear from the site, and come back if the suspension is lifted.
    await Item.updateMany(
      { userId: String(user._id), isAvailable: { $ne: false } },
      { $set: { isAvailable: false, heldAvailable: true } }
    );
    await record(req, 'suspend_user', user._id, user.username, req.body.reason);
    await trySendMail({
      to: user.email,
      subject: 'Your Taste of Home account has been suspended',
      text: [
        `Hi ${user.username},`,
        '',
        'Your account has been suspended, so you can no longer log in and your listings are hidden.',
        `Reason: ${req.body.reason}`,
        '',
        `If you think this is a mistake, contact us: ${clientUrl('/contact')}`,
        '',
        'Taste of Home',
      ].join('\n'),
    });

    // Orders they still owe are not cancelled automatically: the administrator decides.
    const openOrders = await Order.countDocuments(openOrdersFilter([String(user._id)]));
    res.status(200).send(userRow(user, { openOrders }));
  } catch (err) {
    next(err);
  }
};

export const unsuspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(createError(404, 'User not found!'));
    if (!user.suspendedAt) return next(createError(409, 'This account is not suspended.'));

    user.suspendedAt = undefined;
    user.suspendReason = undefined;
    await user.save();
    // Listings that the suspension hid come back; ones taken down on their own stay down.
    await Item.updateMany(
      { userId: String(user._id), heldAvailable: true, takenDownAt: { $exists: false } },
      { $set: { isAvailable: true }, $unset: { heldAvailable: '' } }
    );
    await record(req, 'unsuspend_user', user._id, user.username);
    await trySendMail({
      to: user.email,
      subject: 'Your Taste of Home account is active again',
      text: [
        `Hi ${user.username},`,
        '',
        'The suspension of your account has been lifted. You can log in again, and your listings are back on the site.',
        '',
        'Taste of Home',
      ].join('\n'),
    });
    res.status(200).send(userRow(user));
  } catch (err) {
    next(err);
  }
};

const itemRow = (item, names) => ({
  _id: item._id,
  title: item.title,
  cover: item.cover,
  price: item.price,
  cat: item.cat,
  sales: item.sales,
  isAvailable: item.isAvailable !== false,
  takenDownAt: item.takenDownAt,
  takenDownReason: item.takenDownReason,
  createdAt: item.createdAt,
  sellerId: item.userId,
  seller: names.get(item.userId) || 'deleted account',
});

export const listItems = async (req, res, next) => {
  try {
    const { search, page, state } = parseQuery(req);
    const filter = {
      ...(search && { title: { $regex: escapeRegex(search), $options: 'i' } }),
      ...(state === 'taken_down' && { takenDownAt: { $exists: true } }),
    };
    const [items, total] = await Promise.all([
      Item.find(filter)
        .sort({ createdAt: -1, _id: 1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Item.countDocuments(filter),
    ]);
    const names = await namesOf(items.map((item) => item.userId));
    res.status(200).send(
      paged(
        items.map((item) => itemRow(item, names)),
        total,
        page
      )
    );
  } catch (err) {
    next(err);
  }
};

export const takeDownItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return next(createError(404, 'Item not found!'));
    if (item.takenDownAt) return next(createError(409, 'This listing is already taken down.'));

    // Remember whether it was on sale, so that restoring it puts it back as it was.
    if (item.isAvailable !== false) item.heldAvailable = true;
    item.isAvailable = false;
    item.takenDownAt = new Date();
    item.takenDownReason = req.body.reason;
    await item.save();
    await record(req, 'take_down_item', item._id, item.title, req.body.reason);

    const seller = await User.findById(item.userId).select('username email');
    if (seller) {
      await trySendMail({
        to: seller.email,
        subject: `Your listing "${item.title}" was taken down`,
        text: [
          `Hi ${seller.username},`,
          '',
          `Your listing "${item.title}" has been taken down and is no longer shown to buyers.`,
          `Reason: ${req.body.reason}`,
          '',
          `If you think this is a mistake, contact us: ${clientUrl('/contact')}`,
          '',
          'Taste of Home',
        ].join('\n'),
      });
    }
    res.status(200).send(itemRow(item, await namesOf([item.userId])));
  } catch (err) {
    next(err);
  }
};

export const restoreItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return next(createError(404, 'Item not found!'));
    if (!item.takenDownAt) return next(createError(409, 'This listing is not taken down.'));

    item.takenDownAt = undefined;
    item.takenDownReason = undefined;
    // It goes back on sale if it was on sale before, unless its seller is suspended: then
    // it comes back together with the seller.
    const seller = await User.findById(item.userId).select('suspendedAt');
    if (item.heldAvailable && !seller?.suspendedAt) {
      item.isAvailable = true;
      item.heldAvailable = undefined;
    }
    await item.save();
    await record(req, 'restore_item', item._id, item.title);
    res.status(200).send(itemRow(item, await namesOf([item.userId])));
  } catch (err) {
    next(err);
  }
};

const orderRow = (order, names) => ({
  ...serialize(order),
  ref: orderRef(order),
  buyer: names.get(order.buyerId) || 'deleted account',
  seller: names.get(order.sellerId) || 'deleted account',
});

export const listOrders = async (req, res, next) => {
  try {
    const { search, page, state } = parseQuery(req);
    const conditions = [PAID_ORDER_FILTER];

    if (state && ORDER_STATUSES.includes(state)) {
      conditions.push({ $expr: { $eq: [STATUS_EXPRESSION, state] } });
    }
    if (search) {
      const ref = /^#?([0-9a-f]{6})$/i.exec(search);
      if (ref) {
        // The reference in emails and on the orders page is the end of the order's id.
        conditions.push({
          $expr: {
            $regexMatch: { input: { $toString: '$_id' }, regex: `${ref[1]}$`, options: 'i' },
          },
        });
      } else {
        const text = { $regex: escapeRegex(search), $options: 'i' };
        const people = (await User.find({ username: text }).distinct('_id')).map(String);
        conditions.push({
          $or: [{ title: text }, { buyerId: { $in: people } }, { sellerId: { $in: people } }],
        });
      }
    }

    const filter = { $and: conditions };
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1, _id: 1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Order.countDocuments(filter),
    ]);
    const names = await namesOf(orders.flatMap((order) => [order.buyerId, order.sellerId]));
    res.status(200).send(
      paged(
        orders.map((order) => orderRow(order, names)),
        total,
        page
      )
    );
  } catch (err) {
    next(err);
  }
};

// Refunds the buyer in full and cancels the order, at any stage, delivered orders included.
export const refundOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(createError(404, 'Order not found!'));

    const status = effectiveStatus(order);
    if (status === 'pending_payment') {
      return next(createError(400, 'This order was never paid, so there is nothing to refund.'));
    }
    if (status === 'cancelled') {
      return next(createError(409, 'This order is already cancelled and refunded.'));
    }

    const cancelled = await cancelAndRefund(order, { by: 'admin', reason: req.body.reason });
    await record(
      req,
      'refund_order',
      order._id,
      `${orderRef(order)} ${order.title}`,
      req.body.reason
    );
    res
      .status(200)
      .send(orderRow(cancelled, await namesOf([cancelled.buyerId, cancelled.sellerId])));
  } catch (err) {
    next(err);
  }
};

export const listActions = async (req, res, next) => {
  try {
    const { page } = parseQuery(req);
    const [actions, total] = await Promise.all([
      AdminAction.find()
        // Newest first; the id settles the order of actions recorded in the same instant.
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      AdminAction.countDocuments(),
    ]);
    res.status(200).send(paged(actions, total, page));
  } catch (err) {
    next(err);
  }
};
