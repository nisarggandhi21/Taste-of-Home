import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import { userRoom } from '../socket.js';
import createError from '../utils/createError.js';
import { isParticipant } from './conversation.controller.js';

const findOwnConversation = async (id, userId) => {
  if (typeof id !== 'string' || !id) throw createError(400, 'conversationId is required');
  const conversation = await Conversation.findOne({ id });
  if (!conversation) throw createError(404, 'Conversation not found!');
  if (!isParticipant(conversation, userId)) {
    throw createError(403, 'You are not part of this conversation!');
  }
  return conversation;
};

export const createMessage = async (req, res, next) => {
  try {
    const { conversationId, desc } = req.body;
    if (typeof desc !== 'string' || !desc.trim()) {
      return next(createError(400, 'Message cannot be empty'));
    }
    const conversation = await findOwnConversation(conversationId, req.userId);
    const sentBySeller = conversation.sellerId === req.userId;

    const savedMessage = await new Message({
      conversationId,
      userId: req.userId,
      desc,
    }).save();

    await Conversation.findOneAndUpdate(
      { id: conversationId },
      {
        $set: {
          readBySeller: sentBySeller,
          readByBuyer: !sentBySeller,
          lastMessage: desc,
        },
      }
    );

    // Push the message to the other participant if they are connected.
    const receiverId = sentBySeller ? conversation.buyerId : conversation.sellerId;
    req.app.get('io')?.to(userRoom(receiverId)).emit('getMessage', savedMessage);

    res.status(201).send(savedMessage);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    await findOwnConversation(req.params.id, req.userId);
    const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
    res.status(200).send(messages);
  } catch (error) {
    next(error);
  }
};
