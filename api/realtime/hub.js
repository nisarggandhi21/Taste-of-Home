// Live delivery of chat messages to the people who have the site open.
//
// Each browser keeps one long-lived request open (see streamMessages in the message
// controller) and this module decides what is written to it. A message reaches a stream in
// one of two ways:
//
//   1. Directly. The request that saved the message hands it over (publish). This is instant,
//      and all that is needed when the API runs as a single server.
//   2. Through the database. On serverless hosting the request that saved the message and the
//      request holding the receiver's stream usually run in different instances that share
//      nothing but the database. So while an instance has streams open, it looks for newly
//      saved messages about once a second and delivers the ones for its own streams.
//
// Either way a message is written to a stream at most once.
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

const POLL_MS = Number(process.env.LIVE_POLL_MS) || 1000;
// How far back each look at the database reaches. Generous, so that instances whose clocks
// differ by a few seconds still see each other's messages.
const WINDOW_MS = 15_000;
// More tabs than this for one account: the oldest stream is closed.
const MAX_STREAMS_PER_USER = 5;

// userId -> Set of { send(message), close() }
const streams = new Map();
// Ids of the messages this instance has already dealt with -> when.
const seen = new Map();
// Conversation id -> its two participants. They never change.
const participants = new Map();
let timer = null;
let looking = false;

const deliver = (message, receiverId) => {
  const id = String(message._id);
  if (seen.has(id)) return;
  seen.set(id, Date.now());
  for (const stream of streams.get(String(receiverId)) || []) stream.send(message);
};

const receiverOf = async (message) => {
  let pair = participants.get(message.conversationId);
  if (!pair) {
    const conversation = await Conversation.findOne({ id: message.conversationId })
      .select('sellerId buyerId')
      .lean();
    if (!conversation) return null;
    pair = [conversation.sellerId, conversation.buyerId];
    if (participants.size > 5000) participants.clear();
    participants.set(message.conversationId, pair);
  }
  return pair[0] === message.userId ? pair[1] : pair[0];
};

// `quietly` marks what is already there as dealt with, without delivering it.
const look = async ({ quietly = false } = {}) => {
  if (looking) return;
  looking = true;
  try {
    const recent = await Message.find({ createdAt: { $gt: new Date(Date.now() - WINDOW_MS) } })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();
    for (const message of recent) {
      if (seen.has(String(message._id))) continue;
      if (quietly) {
        seen.set(String(message._id), Date.now());
        continue;
      }
      const receiverId = await receiverOf(message);
      if (receiverId) deliver(message, receiverId);
      else seen.set(String(message._id), Date.now());
    }
    // Forget messages that can no longer come up in a look.
    const cutoff = Date.now() - 4 * WINDOW_MS;
    for (const [id, at] of seen) if (at < cutoff) seen.delete(id);
  } catch (err) {
    console.error('Could not check for new messages:', err.message);
  } finally {
    looking = false;
  }
};

const start = () => {
  if (timer) return;
  // Messages saved before the first stream opened are not news to it.
  look({ quietly: true });
  timer = setInterval(look, POLL_MS);
  timer.unref();
};

const stop = () => {
  clearInterval(timer);
  timer = null;
};

// Called by the request that saved a message.
export const publish = (message, receiverId) => deliver(message, receiverId);

// Registers an open stream. Returns the function that removes it again.
export const subscribe = (userId, stream) => {
  const id = String(userId);
  const own = streams.get(id) || new Set();
  streams.set(id, own);
  if (own.size >= MAX_STREAMS_PER_USER) own.values().next().value.close();
  own.add(stream);
  start();

  return () => {
    own.delete(stream);
    if (own.size === 0 && streams.get(id) === own) streams.delete(id);
    if (streams.size === 0) stop();
  };
};

// For the tests.
export const openStreamCount = () => [...streams.values()].reduce((sum, own) => sum + own.size, 0);
