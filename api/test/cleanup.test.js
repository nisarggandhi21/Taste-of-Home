// What happens around deleting an item or an account, and signed image uploads.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, test } from 'node:test';
import { createClient, sampleCheckout, sampleItem } from './support/client.js';
import { markSucceeded } from './support/fake-stripe.js';
import { startTestServer } from './support/server.js';

let server, db, call, register;
let seller, buyer, voter;

const count = (collection, filter = {}) => db.collection(collection).countDocuments(filter);
const addItem = async (title) =>
  (await call('POST', '/api/items', { cookie: seller.cookie, body: { ...sampleItem, title } })).data
    ._id;
const paidOrder = async (user, itemId) => {
  const res = await call('POST', `/api/orders/create-payment-intent/${itemId}`, {
    cookie: user.cookie,
    body: sampleCheckout,
  });
  const intentId = res.data.clientSecret.split('_secret')[0];
  markSucceeded(intentId);
  await call('PUT', '/api/orders', { cookie: user.cookie, body: { payment_intent: intentId } });
  return String((await db.collection('orders').findOne({ payment_intent: intentId }))._id);
};
const deliver = async (orderId) => {
  for (const status of ['accepted', 'preparing', 'out_for_delivery', 'delivered']) {
    await call('PATCH', `/api/orders/${orderId}/status`, {
      cookie: seller.cookie,
      body: { status },
    });
  }
};
const review = (user, itemId, star) =>
  call('POST', '/api/reviews', { cookie: user.cookie, body: { itemId, desc: 'A review', star } });

before(async () => {
  server = await startTestServer({
    env: {
      CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      CLOUDINARY_API_KEY: '1234567890',
      CLOUDINARY_API_SECRET: 'test-api-secret',
    },
  });
  db = server.db;
  ({ call, register } = createClient(server.baseUrl));
  seller = await register('albert', true);
  buyer = await register('stefan');
  voter = await register('vera');
});

after(() => server.stop());

test('signed uploads: the server signs, the secret stays on the server', async () => {
  const res = await call('POST', '/api/uploads/signature');
  assert.equal(res.status, 200);
  const { cloudName, apiKey, params, signature } = res.data;
  assert.equal(cloudName, 'demo-cloud');
  assert.equal(apiKey, '1234567890');
  assert.equal(JSON.stringify(res.data).includes('test-api-secret'), false);

  // Only images, and only into the site's folder; both are covered by the signature.
  assert.equal(params.allowed_formats, 'jpg,jpeg,png,webp');
  assert.equal(params.folder, 'taste-of-home');
  assert.ok(Math.abs(params.timestamp - Date.now() / 1000) < 60);

  // Cloudinary's documented rule, worked out independently of the server code.
  const expected = crypto
    .createHash('sha1')
    .update(
      `allowed_formats=jpg,jpeg,png,webp&folder=taste-of-home&timestamp=${params.timestamp}test-api-secret`
    )
    .digest('hex');
  assert.equal(signature, expected);
});

test('deleting an item removes its reviews and favourites but keeps order history', async () => {
  const kept = await addItem('Kept Item');
  const removed = await addItem('Removed Item');
  for (const itemId of [kept, removed]) {
    await deliver(await paidOrder(buyer, itemId));
    assert.equal((await review(buyer, itemId, 5)).status, 201);
    await call('PUT', `/api/users/me/favourites/${itemId}`, { cookie: voter.cookie });
  }

  const res = await call('DELETE', `/api/items/${removed}`, { cookie: seller.cookie });
  assert.equal(res.status, 200);

  assert.equal(await count('items'), 1);
  assert.equal(await count('reviews', { itemId: removed }), 0);
  assert.equal(await count('reviews', { itemId: kept }), 1);
  const favourites = await call('GET', '/api/users/me/favourites', { cookie: voter.cookie });
  assert.deepEqual(
    favourites.data.map((item) => item.title),
    ['Kept Item']
  );
  const stored = await db.collection('users').findOne({ username: 'vera' });
  assert.deepEqual(stored.favourites, [kept], 'the deleted id is gone from the saved list');

  const orders = await call('GET', '/api/orders', { cookie: buyer.cookie });
  assert.equal(orders.data.length, 2, 'both orders are still in the history');
});

test('one review per buyer per item is enforced by the database too', async () => {
  const [existing] = await db.collection('reviews').find().toArray();
  await assert.rejects(
    db
      .collection('reviews')
      .insertOne({ itemId: existing.itemId, userId: existing.userId, star: 1, desc: 'again' }),
    /duplicate key/
  );
});

test('deleting an account needs the password and no open orders', async () => {
  const remove = (user, body, id = user.id) =>
    call('DELETE', `/api/users/${id}`, { cookie: user.cookie, body });
  const [item] = await db.collection('items').find().toArray();
  const itemId = String(item._id);

  // The buyer leaves a vote and a conversation behind, and has one order still open.
  const sellersReview = (await call('GET', `/api/reviews/${itemId}`)).data[0];
  const conversation = await call('POST', '/api/conversations', {
    cookie: buyer.cookie,
    body: { to: seller.id },
  });
  await call('POST', '/api/messages', {
    cookie: buyer.cookie,
    body: { conversationId: conversation.data.id, desc: 'Hello' },
  });
  await call('POST', `/api/reviews/${sellersReview._id}/vote`, {
    cookie: voter.cookie,
    body: { helpful: true },
  });
  const open = await paidOrder(buyer, itemId);

  assert.equal((await remove(buyer, { password: 'secret123' }, seller.id)).status, 403);
  assert.equal((await remove(buyer, {})).status, 400);
  assert.equal((await remove(buyer, { password: 'wrong' })).status, 400);
  const blocked = await remove(buyer, { password: 'secret123' });
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.message, /1 open order/);
  assert.equal(await count('users', { username: 'stefan' }), 1);

  await call('POST', `/api/orders/${open}/cancel`, { cookie: buyer.cookie });
  const done = await remove(buyer, { password: 'secret123' });
  assert.equal(done.status, 200);
  assert.match(done.setCookie, /accessToken=;/, 'the login cookie is cleared');

  // The account, its review (taken back out of the rating) and its conversation are gone.
  assert.equal(await count('users', { username: 'stefan' }), 0);
  assert.equal(await count('reviews', { userId: buyer.id }), 0);
  const after = await db.collection('items').findOne({ _id: item._id });
  assert.deepEqual([after.totalStars, after.starNumber], [0, 0]);
  assert.equal(await count('conversations'), 0);
  assert.equal(await count('messages'), 0);
  const login = await call('POST', '/api/auth/login', {
    body: { username: 'stefan', password: 'secret123' },
  });
  assert.equal(login.status, 400);

  // The seller still has the order history.
  const orders = await call('GET', '/api/orders', { cookie: seller.cookie });
  assert.equal(orders.data.length, 3);
});

test('deleting a seller account removes their items everywhere', async () => {
  const itemId = String((await db.collection('items').findOne())._id);
  await call('PUT', `/api/users/me/favourites/${itemId}`, { cookie: voter.cookie });

  const res = await call('DELETE', `/api/users/${seller.id}`, {
    cookie: seller.cookie,
    body: { password: 'secret123' },
  });
  assert.equal(res.status, 200);
  assert.equal(await count('items'), 0);
  assert.equal(await count('reviews'), 0);
  const favourites = await call('GET', '/api/users/me/favourites', { cookie: voter.cookie });
  assert.deepEqual(favourites.data, []);
  assert.equal((await call('GET', `/api/users/${seller.id}`)).status, 404);
});
