// Live message delivery on serverless hosting, where the request that saves a message and
// the request holding the receiver's stream run in different instances.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient } from './support/client.js';
import { startTestServer } from './support/server.js';

let server, db, call, register, openStream, openStreamCount;
let seller, buyer, outsider, conversationId;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Resolves once `check` is true, or fails after two seconds.
const eventually = async (check, what) => {
  for (let i = 0; i < 40; i++) {
    if (check()) return;
    await wait(50);
  }
  assert.fail(`timed out waiting for ${what}`);
};
// Saves a message the way another instance would: straight into the shared database, without
// this server ever handling the request.
const savedElsewhere = async (desc, from = buyer) => {
  const now = new Date();
  const { insertedId } = await db
    .collection('messages')
    .insertOne({ conversationId, userId: from.id, desc, createdAt: now, updatedAt: now });
  return String(insertedId);
};

before(async () => {
  // Look at the database often, and end streams after two seconds, so the tests are quick.
  server = await startTestServer({ env: { LIVE_POLL_MS: '60', LIVE_STREAM_SECONDS: '2' } });
  db = server.db;
  ({ call, register, openStream } = createClient(server.baseUrl));
  ({ openStreamCount } = await import('../realtime/hub.js'));
  seller = await register('albert', true);
  buyer = await register('stefan');
  outsider = await register('eve');
  const conversation = await call('POST', '/api/conversations', {
    cookie: buyer.cookie,
    body: { to: seller.id },
  });
  conversationId = conversation.data.id;
});

after(() => server.stop());

test('a message saved by another instance still reaches the receiver, once', async () => {
  // Already there before anybody was listening: not news.
  await savedElsewhere('sent before the stream opened');

  const sellerStream = await openStream({ cookie: seller.cookie });
  const outsiderStream = await openStream({ cookie: outsider.cookie });
  const buyerStream = await openStream({ cookie: buyer.cookie });
  await wait(150);

  const id = await savedElsewhere('Is the thali spicy?');
  await eventually(() => sellerStream.messages().length === 1, 'the message');
  assert.equal(sellerStream.messages()[0]._id, id);
  assert.equal(sellerStream.messages()[0].desc, 'Is the thali spicy?');

  // A message this server saved itself arrives straight away, and is not sent a second
  // time when it later turns up in the database.
  const sent = await call('POST', '/api/messages', {
    cookie: buyer.cookie,
    body: { conversationId, desc: 'And is it vegan?' },
  });
  await eventually(() => sellerStream.messages().length === 2, 'the second message');
  await wait(300);
  assert.deepEqual(
    sellerStream.messages().map((message) => message._id),
    [id, sent.data._id]
  );

  // The other direction, and nobody else ever hears anything.
  await savedElsewhere('Mild, and yes', seller);
  await eventually(() => buyerStream.messages().length === 1, 'the reply');
  assert.equal(buyerStream.messages()[0].desc, 'Mild, and yes');
  assert.equal(sellerStream.messages().length, 2);
  assert.equal(outsiderStream.messages().length, 0);

  for (const stream of [sellerStream, outsiderStream, buyerStream]) stream.close();
});

test('a stream ends by itself before the host would cut it off, and cleans up', async () => {
  await eventually(() => openStreamCount() === 0, 'the earlier streams to close');

  const stream = await openStream({ cookie: seller.cookie });
  assert.equal(stream.events[0]?.event ?? 'ready', 'ready');
  assert.equal(openStreamCount(), 1);
  await wait(2300);
  assert.equal(stream.ended(), true, 'closed by the server after LIVE_STREAM_SECONDS');
  assert.equal(openStreamCount(), 0);
});

test('one account cannot hold an unlimited number of streams', async () => {
  const opened = [];
  for (let i = 0; i < 6; i++) opened.push(await openStream({ cookie: seller.cookie }));
  await eventually(() => opened[0].ended(), 'the oldest stream to be closed');
  assert.equal(openStreamCount(), 5);
  assert.equal(
    opened.slice(1).some((stream) => stream.ended()),
    false
  );
  for (const stream of opened) stream.close();
});

test('a suspended or logged-out account gets no stream', async () => {
  assert.equal((await openStream()).status, 401);
  await db
    .collection('users')
    .updateOne({ username: 'eve' }, { $set: { suspendedAt: new Date(), suspendReason: 'test' } });
  assert.equal((await openStream({ cookie: outsider.cookie })).status, 401);
});
