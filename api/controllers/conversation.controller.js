import mongoose from 'mongoose';
import Conversation from '../models/conversation.model.js';
import User from '../models/user.model.js';
import createError from '../utils/createError.js';

export const isParticipant = (conversation, userId) =>
  conversation.sellerId === userId || conversation.buyerId === userId;

export const createConversation = async (req, res, next) => {
  try {
    const to = req.body.to;
    if (typeof to !== 'string' || !mongoose.isValidObjectId(to)) {
      return next(createError(400, 'A valid recipient is required'));
    }
    if (to === req.userId) {
      return next(createError(400, 'You cannot start a conversation with yourself'));
    }
    if (!(await User.exists({ _id: to }))) {
      return next(createError(404, 'User not found!'));
    }

    // One conversation per pair of people, whichever of them started it.
    const existing = await Conversation.findOne({
      $or: [
        { sellerId: req.userId, buyerId: to },
        { sellerId: to, buyerId: req.userId },
      ],
    });
    if (existing) return res.status(200).send(existing);

    const id = req.isSeller ? req.userId + to : to + req.userId;

    const savedConversation = await new Conversation({
      id,
      sellerId: req.isSeller ? req.userId : to,
      buyerId: req.isSeller ? to : req.userId,
      readBySeller: req.isSeller,
      readByBuyer: !req.isSeller,
    }).save();
    res.status(201).send(savedConversation);
  } catch (err) {
    next(err);
  }
};

export const updateConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ id: req.params.id });
    if (!conversation) return next(createError(404, 'Not found!'));
    if (!isParticipant(conversation, req.userId)) {
      return next(createError(403, 'You are not part of this conversation!'));
    }

    const updatedConversation = await Conversation.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: conversation.sellerId === req.userId ? { readBySeller: true } : { readByBuyer: true },
      },
      { new: true }
    );

    res.status(200).send(updatedConversation);
  } catch (err) {
    next(err);
  }
};

export const getSingleConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ id: req.params.id });
    if (!conversation) return next(createError(404, 'Not found!'));
    if (!isParticipant(conversation, req.userId)) {
      return next(createError(403, 'You are not part of this conversation!'));
    }
    res.status(200).send(conversation);
  } catch (err) {
    next(err);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      $or: [{ sellerId: req.userId }, { buyerId: req.userId }],
    }).sort({ updatedAt: -1 });
    res.status(200).send(conversations);
  } catch (err) {
    next(err);
  }
};
