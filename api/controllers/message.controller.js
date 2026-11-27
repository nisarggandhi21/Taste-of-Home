import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import { publish, subscribe } from '../realtime/hub.js';
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

    // Hand the message to the other participant's open streams, if this server holds any.
    const receiverId = sentBySeller ? conversation.buyerId : conversation.sellerId;
    publish(savedMessage.toObject(), receiverId);

    res.status(201).send(savedMessage);
  } catch (error) {
    next(error);
  }
};

// How long one stream stays open before the browser is asked to reconnect. Serverless hosts
// end every request after a fixed time (60 seconds on Vercel, see index.js), so there the
// stream ends itself a little earlier and the browser opens the next one straight away.
const streamSeconds = () =>
  Number(process.env.LIVE_STREAM_SECONDS) || (process.env.VERCEL ? 50 : 300);
const HEARTBEAT_MS = 15_000;

// A long-lived response (server-sent events) on which the logged-in user receives messages
// sent to them, as they are sent. Events: "ready" once, "message" per message, and "ping" as
// a sign of life. Unlike a WebSocket this is an ordinary HTTP response, so it also works on
// serverless hosting.
export const streamMessages = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Asks reverse proxies not to hold the events back.
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data = {}) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // How long the browser waits before reconnecting when the stream ends.
  res.write('retry: 1500\n\n');
  send('ready');

  const unsubscribe = subscribe(req.userId, {
    send: (message) => send('message', message),
    close: () => res.end(),
  });
  const heartbeat = setInterval(() => send('ping'), HEARTBEAT_MS);
  const lifetime = setTimeout(() => res.end(), streamSeconds() * 1000);

  // Runs when the browser goes away and when the stream ends itself.
  res.on('close', () => {
    clearInterval(heartbeat);
    clearTimeout(lifetime);
    unsubscribe();
  });
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
