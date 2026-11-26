// End-to-end tests for the API. The tests run in order and share state: three users,
// one item, the orders they place and the conversation between buyer and seller.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createClient, sampleItem } from './support/client.js';
import FakeStripe, { markSucceeded, paymentIntents } from './support/fake-stripe.js';
import { CLIENT_ORIGIN, JWT_KEY, WEBHOOK_SECRET, startTestServer } from './support/server.js';

const newId = () => String(new mongoose.Types.ObjectId());
const intentIdOf = (res) => res.data.clientSecret.split('_secret')[0];

let server, db, call, register, connectSocket;
let seller, buyer, outsider;
let itemId, convId;

before(async () => {
  server = await startTestServer();
  db = server.db;
  ({ call, register, connectSocket } = createClient(server.baseUrl));
  seller = await register('albert', true);
  buyer = await register('stefan');
  outsider = await register('eve');
});

after(() => server.stop());

test('registration and validation', async () => {
  assert.equal(seller.res.data.location, 'Mumbai');
  assert.equal('password' in seller.res.data, false);

  const bad = await call('POST', '/api/auth/register', {
    body: { username: 'ab', email: 'bad', password: '1' },
  });
  assert.equal(bad.status, 400);
  assert.match(bad.data.message, /at least 3 characters/);
});

test('public profile hides private fields', async () => {
  const res = await call('GET', `/api/users/${seller.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.data.username, 'albert');
  for (const field of ['password', 'email', 'phone']) assert.equal(field in res.data, false);
});

test('sessions expire and old tokens are rejected', async () => {
  assert.match(seller.res.setCookie, /Max-Age=604800/);
  assert.match(seller.res.setCookie, /HttpOnly/);
  const payload = jwt.decode(seller.cookie.split('=')[1]);
  assert.equal(payload.exp - payload.iat, 604800);

  const claims = { id: seller.id, isSeller: true };
  const tokens = {
    'without expiry': jwt.sign(claims, JWT_KEY),
    expired: jwt.sign(claims, JWT_KEY, { expiresIn: -10 }),
    'signed with another key': jwt.sign(claims, 'wrong-key', { expiresIn: 600 }),
  };
  for (const [name, token] of Object.entries(tokens)) {
    const res = await call('GET', '/api/orders', { cookie: `accessToken=${token}` });
    assert.equal(res.status, 401, `token ${name}`);
  }

  const socket = await connectSocket({ cookie: `accessToken=${tokens['without expiry']}` });
  assert.equal(socket.ok, false);
  socket.socket.close();
});

test('login does not reveal which part was wrong', async () => {
  const unknown = await call('POST', '/api/auth/login', {
    body: { username: 'nobody-here', password: 'secret123' },
  });
  const wrong = await call('POST', '/api/auth/login', {
    body: { username: 'albert', password: 'wrong-password' },
  });
  assert.equal(unknown.status, 400);
  assert.equal(wrong.status, 400);
  assert.equal(unknown.data.message, wrong.data.message);

  const ok = await call('POST', '/api/auth/login', {
    body: { username: 'albert', password: 'secret123' },
  });
  assert.equal(ok.status, 200);
  assert.equal('password' in ok.data, false);
});

test('creating and deleting items', async () => {
  let res = await call('POST', '/api/items', { cookie: buyer.cookie, body: sampleItem });
  assert.equal(res.status, 403);
  assert.equal(res.data.message, 'You are not a seller');

  res = await call('POST', '/api/items', {
    cookie: seller.cookie,
    body: { ...sampleItem, price: '250', deliveryTime: '2' },
  });
  assert.equal(res.status, 400);
  assert.match(res.data.message, /Price must be a number/);

  // Fields a caller must not control are ignored.
  res = await call('POST', '/api/items', {
    cookie: seller.cookie,
    body: { ...sampleItem, userId: outsider.id, totalStars: 500, starNumber: 100, sales: 9999 },
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.userId, seller.id);
  assert.equal(res.data.totalStars, 0);
  assert.equal(res.data.starNumber, 0);
  assert.equal(res.data.sales, 0);
  itemId = res.data._id;

  res = await call('DELETE', `/api/items/${newId()}`, { cookie: seller.cookie });
  assert.equal(res.status, 404);
  res = await call('DELETE', `/api/items/${itemId}`, { cookie: buyer.cookie });
  assert.equal(res.status, 403);
  res = await call('GET', `/api/items/single/${newId()}`);
  assert.equal(res.status, 404);
});

test('orders are only paid once Stripe says so', async () => {
  let res = await call('POST', `/api/orders/create-payment-intent/${itemId}`, {
    cookie: buyer.cookie,
  });
  const intentId = intentIdOf(res);
  assert.equal(paymentIntents.get(intentId).amount, 25000, '250 rupees is charged as 25000 paise');
  assert.equal(paymentIntents.get(intentId).currency, 'inr');

  res = await call('GET', '/api/orders', { cookie: buyer.cookie });
  assert.deepEqual(res.data, [], 'unpaid orders are hidden');

  const order = await db.collection('orders').findOne({ payment_intent: intentId });
  res = await call('PATCH', `/api/orders/complete/${order._id}`, { cookie: seller.cookie });
  assert.equal(res.status, 400, 'an unpaid order cannot be completed');

  res = await call('PUT', '/api/orders', {
    cookie: outsider.cookie,
    body: { payment_intent: intentId },
  });
  assert.equal(res.status, 403);
  res = await call('PUT', '/api/orders', {
    cookie: buyer.cookie,
    body: { payment_intent: intentId },
  });
  assert.equal(res.status, 402, 'not paid yet');
  res = await call('PUT', '/api/orders', {
    cookie: buyer.cookie,
    body: { payment_intent: { $ne: null } },
  });
  assert.equal(res.status, 400);

  markSucceeded(intentId);
  res = await call('PUT', '/api/orders', {
    cookie: buyer.cookie,
    body: { payment_intent: intentId },
  });
  assert.equal(res.status, 200);
  await call('PUT', '/api/orders', { cookie: buyer.cookie, body: { payment_intent: intentId } });

  res = await call('GET', '/api/orders', { cookie: seller.cookie });
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].isPaid, true);
  assert.equal(res.data[0].isCompleted, false);

  res = await call('GET', `/api/items/single/${itemId}`);
  assert.equal(res.data.sales, 1, 'confirming twice counts one sale');

  res = await call('PATCH', `/api/orders/complete/${order._id}`, { cookie: buyer.cookie });
  assert.equal(res.status, 403);
  res = await call('PATCH', `/api/orders/complete/${order._id}`, { cookie: seller.cookie });
  assert.equal(res.status, 200);
  const completed = await db.collection('orders').findOne({ _id: order._id });
  assert.equal(completed.isCompleted, true);
});

test('Stripe webhook marks an order paid', async () => {
  let res = await call('POST', `/api/orders/create-payment-intent/${itemId}`, {
    cookie: buyer.cookie,
  });
  const intentId = intentIdOf(res);
  const payload = JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type: 'payment_intent.succeeded',
    data: { object: { id: intentId } },
  });
  const send = (signature) =>
    call('POST', '/api/orders/webhook', {
      raw: payload,
      headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
    });

  res = await send('t=1,v1=bad');
  assert.equal(res.status, 400);

  const signature = new FakeStripe('sk_test_fake').webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  res = await send(signature);
  assert.equal(res.status, 200);
  const order = await db.collection('orders').findOne({ payment_intent: intentId });
  assert.equal(order.isPaid, true);
  assert.equal(order.isCompleted, false);
});

test('orders created before isPaid existed are still listed', async () => {
  const legacy = { itemId, price: 10, sellerId: seller.id, buyerId: buyer.id };
  await db.collection('orders').insertMany([
    { ...legacy, title: 'Legacy', isCompleted: true, payment_intent: 'pi_legacy_1' },
    { ...legacy, title: 'LegacyAbandoned', isCompleted: false, payment_intent: 'pi_legacy_2' },
  ]);
  const res = await call('GET', '/api/orders', { cookie: buyer.cookie });
  const titles = res.data.map((order) => order.title);
  assert.equal(titles.includes('Legacy'), true);
  assert.equal(titles.includes('LegacyAbandoned'), false);
});

test('requests from other websites are refused', async () => {
  const path = `/api/orders/create-payment-intent/${itemId}`;
  const before = await db.collection('orders').countDocuments();

  let res = await call('POST', path, {
    cookie: buyer.cookie,
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(res.status, 403);
  assert.equal(await db.collection('orders').countDocuments(), before);

  res = await call('POST', path, { cookie: buyer.cookie, headers: { Origin: CLIENT_ORIGIN } });
  assert.equal(res.status, 200);

  const evil = await connectSocket({ cookie: seller.cookie, origin: 'https://evil.example' });
  assert.equal(evil.ok, false);
  evil.socket.close();
  const good = await connectSocket({ cookie: seller.cookie, origin: CLIENT_ORIGIN });
  assert.equal(good.ok, true);
  good.socket.close();
});

test('conversations are private to their two participants', async () => {
  let res = await call('POST', '/api/conversations', {
    cookie: buyer.cookie,
    body: { to: seller.id },
  });
  assert.equal(res.status, 201);
  convId = res.data.id;
  assert.equal(convId, seller.id + buyer.id);

  res = await call('POST', '/api/conversations', { cookie: buyer.cookie, body: { to: seller.id } });
  assert.equal(res.status, 200, 'asking again returns the existing conversation');
  assert.equal(res.data.id, convId);

  res = await call('POST', '/api/conversations', {
    cookie: buyer.cookie,
    body: { to: { $ne: 'x' } },
  });
  assert.equal(res.status, 400);

  const blocked = [
    ['GET', `/api/conversations/single/${convId}`],
    ['PUT', `/api/conversations/${convId}`],
    ['GET', `/api/messages/${convId}`],
    ['POST', '/api/messages', { conversationId: convId, desc: 'hi' }],
  ];
  for (const [method, path, body] of blocked) {
    res = await call(method, path, { cookie: outsider.cookie, body });
    assert.equal(res.status, 403, `${method} ${path}`);
  }

  // The orders page relies on a 404 to know it has to create the conversation.
  res = await call('GET', `/api/conversations/single/${seller.id + outsider.id}`, {
    cookie: outsider.cookie,
  });
  assert.equal(res.status, 404);
});

test('messages are pushed only to the receiver', async () => {
  const anonymous = await connectSocket();
  assert.equal(anonymous.ok, false);
  const forged = await connectSocket({ cookie: 'accessToken=not.a.jwt' });
  assert.equal(forged.ok, false);

  const sellerSocket = await connectSocket({ cookie: seller.cookie });
  const outsiderSocket = await connectSocket({ cookie: outsider.cookie });
  assert.equal(sellerSocket.ok && outsiderSocket.ok, true);

  const received = { seller: [], outsider: [] };
  sellerSocket.socket.on('getMessage', (message) => received.seller.push(message));
  outsiderSocket.socket.on('getMessage', (message) => received.outsider.push(message));
  // Claiming to be someone else has no effect.
  outsiderSocket.socket.emit('addUser', seller.id);

  let res = await call('POST', '/api/messages', {
    cookie: buyer.cookie,
    body: { conversationId: convId, desc: 'Is the thali spicy?' },
  });
  assert.equal(res.status, 201);
  await new Promise((resolve) => setTimeout(resolve, 300));

  assert.equal(received.seller.length, 1);
  assert.equal(received.seller[0].desc, 'Is the thali spicy?');
  assert.equal(received.seller[0].conversationId, convId);
  assert.equal(received.seller[0].userId, buyer.id);
  assert.equal(received.outsider.length, 0);

  res = await call('GET', `/api/messages/${convId}`, { cookie: seller.cookie });
  assert.equal(res.data.length, 1);

  res = await call('GET', '/api/conversations', { cookie: seller.cookie });
  assert.equal(res.data[0].readBySeller, false);
  assert.equal(res.data[0].readByBuyer, true);
  assert.equal(res.data[0].lastMessage, 'Is the thali spicy?');

  res = await call('PUT', `/api/conversations/${convId}`, { cookie: seller.cookie });
  assert.equal(res.data.readBySeller, true);

  for (const s of [anonymous, forged, sellerSocket, outsiderSocket]) s.socket.close();
});

test('reviews need a paid order and can be removed by their author', async () => {
  const review = (cookie, body) => call('POST', '/api/reviews', { cookie, body });

  let res = await review(outsider.cookie, { itemId, desc: 'Never ordered it', star: 1 });
  assert.equal(res.status, 403);
  assert.match(res.data.message, /ordered/);

  res = await review(buyer.cookie, { itemId, desc: 'Lovely', star: 9 });
  assert.equal(res.status, 400);
  res = await review(buyer.cookie, { itemId: { $ne: null }, desc: 'x', star: 5 });
  assert.equal(res.status, 400);
  res = await review(buyer.cookie, { itemId: newId(), desc: 'x', star: 5 });
  assert.equal(res.status, 404);
  res = await review(seller.cookie, { itemId, desc: 'My own', star: 5 });
  assert.equal(res.status, 403);

  res = await review(buyer.cookie, { itemId, desc: 'Lovely thali', star: '5' });
  assert.equal(res.status, 201);
  assert.equal(res.data.star, 5);
  const reviewId = res.data._id;
  let item = (await call('GET', `/api/items/single/${itemId}`)).data;
  assert.deepEqual([item.totalStars, item.starNumber], [5, 1]);

  res = await review(buyer.cookie, { itemId, desc: 'Again', star: 5 });
  assert.equal(res.status, 403, 'one review per buyer');

  res = await call('DELETE', `/api/reviews/${reviewId}`);
  assert.equal(res.status, 401);
  res = await call('DELETE', `/api/reviews/${reviewId}`, { cookie: outsider.cookie });
  assert.equal(res.status, 403);
  res = await call('DELETE', `/api/reviews/${reviewId}`, { cookie: buyer.cookie });
  assert.equal(res.status, 200);
  item = (await call('GET', `/api/items/single/${itemId}`)).data;
  assert.deepEqual([item.totalStars, item.starNumber], [0, 0]);
});

test('item search treats input as plain text', async () => {
  await call('POST', '/api/items', {
    cookie: seller.cookie,
    body: { ...sampleItem, title: 'Veg Burger (large)', cat: 'burger', price: 120 },
  });
  const search = (query, cookie) => call('GET', `/api/items${query}`, { cookie });

  let res = await search('?min=&max=&sort=sales');
  assert.equal(res.status, 200);
  assert.equal(res.data.length, 2, 'the query the items page sends by default');

  res = await search('?search=.*');
  assert.equal(res.data.length, 0, 'a regex wildcard matches nothing');
  res = await search('?search=(large');
  assert.equal(res.status, 200);
  assert.equal(res.data[0].title, 'Veg Burger (large)');
  res = await search('?search=THALI');
  assert.equal(res.data.length, 1, 'search stays case-insensitive');

  res = await search('?cat=burger');
  assert.deepEqual(
    res.data.map((item) => item.cat),
    ['burger']
  );
  res = await search('?min=150&max=300');
  assert.deepEqual(
    res.data.map((item) => item.price),
    [250]
  );
  res = await search('?sort=price');
  assert.equal(res.data[0].price, 250);

  for (const query of ['?sort=password', '?userId[$ne]=x', '?search[$regex]=.*', '?min=abc']) {
    res = await search(query);
    assert.equal(res.status, 400, query);
  }

  res = await search(`?userId=${seller.id}`, seller.cookie);
  assert.equal(res.data.length, 2, 'a seller sees their own items when asking for them');
  res = await search('', seller.cookie);
  assert.equal(res.data.length, 0, 'own items are hidden from general browsing');
});
