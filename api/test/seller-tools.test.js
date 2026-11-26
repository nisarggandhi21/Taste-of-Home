// Seller tools and the smaller features around items: editing, pausing, favourites,
// helpful votes, public seller stats, the earnings summary and seller-to-seller chat.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import { createClient, sampleCheckout, sampleItem } from './support/client.js';
import { markSucceeded } from './support/fake-stripe.js';
import { startTestServer } from './support/server.js';

const newId = () => String(new mongoose.Types.ObjectId());

let server, db, call, register;
let seller, otherSeller, buyer, voter;
let itemId;

// Places and pays for an order, returning its id.
const paidOrder = async (user, id = itemId, checkout = sampleCheckout) => {
  const res = await call('POST', `/api/orders/create-payment-intent/${id}`, {
    cookie: user.cookie,
    body: checkout,
  });
  const intentId = res.data.clientSecret.split('_secret')[0];
  markSucceeded(intentId);
  await call('PUT', '/api/orders', { cookie: user.cookie, body: { payment_intent: intentId } });
  const order = await db.collection('orders').findOne({ payment_intent: intentId });
  return String(order._id);
};
const setStatus = (orderId, status) =>
  call('PATCH', `/api/orders/${orderId}/status`, { cookie: seller.cookie, body: { status } });
const browse = async (query = '', cookie) =>
  (await call('GET', `/api/items${query}`, { cookie })).data.items.map((item) => item.title);

before(async () => {
  server = await startTestServer();
  db = server.db;
  ({ call, register } = createClient(server.baseUrl));
  seller = await register('albert', true);
  otherSeller = await register('berta', true, 'Pune');
  buyer = await register('stefan');
  voter = await register('vera');
  const created = await call('POST', '/api/items', { cookie: seller.cookie, body: sampleItem });
  itemId = created.data._id;
});

after(() => server.stop());

test('a seller edits their own item', async () => {
  const edit = (cookie, body, id = itemId) => call('PUT', `/api/items/${id}`, { cookie, body });
  const changes = { ...sampleItem, title: 'Paneer Thali Deluxe', price: 280, allergens: [] };

  assert.equal((await edit(undefined, changes)).status, 401);
  assert.equal((await edit(buyer.cookie, changes)).status, 403);
  assert.equal((await edit(otherSeller.cookie, changes)).status, 403);
  assert.equal((await edit(seller.cookie, changes, newId())).status, 404);
  assert.equal((await edit(seller.cookie, { ...changes, price: '280' })).status, 400);

  // Fields the seller must not control are ignored on edit as well.
  const res = await edit(seller.cookie, {
    ...changes,
    userId: buyer.id,
    sales: 999,
    totalStars: 50,
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.title, 'Paneer Thali Deluxe');
  assert.equal(res.data.price, 280);
  assert.deepEqual(res.data.allergens, []);
  assert.equal(res.data.userId, seller.id);
  assert.equal(res.data.sales, 0);
  assert.equal(res.data.totalStars, 0);
});

test('a paused item is hidden and cannot be ordered', async () => {
  const pause = (cookie, isAvailable) =>
    call('PATCH', `/api/items/${itemId}/availability`, { cookie, body: { isAvailable } });

  assert.equal((await pause(otherSeller.cookie, false)).status, 403);
  assert.equal((await pause(seller.cookie, 'no')).status, 400);
  const paused = await pause(seller.cookie, false);
  assert.equal(paused.status, 200);
  assert.equal(paused.data.isAvailable, false);

  assert.deepEqual(await browse(), []);
  assert.deepEqual(await browse(`?userId=${seller.id}`), [], 'hidden on the seller profile too');
  assert.deepEqual(await browse(`?userId=${seller.id}`, seller.cookie), ['Paneer Thali Deluxe']);

  // The page still opens (for links and past buyers) but ordering is refused.
  const single = await call('GET', `/api/items/single/${itemId}`);
  assert.equal(single.data.isAvailable, false);
  const order = await call('POST', `/api/orders/create-payment-intent/${itemId}`, {
    cookie: buyer.cookie,
    body: sampleCheckout,
  });
  assert.equal(order.status, 400);
  assert.match(order.data.message, /not available/);

  await pause(seller.cookie, true);
  assert.deepEqual(await browse(), ['Paneer Thali Deluxe']);
});

test('favourites', async () => {
  const path = `/api/users/me/favourites/${itemId}`;
  assert.equal((await call('GET', '/api/users/me/favourites')).status, 401);
  assert.equal((await call('PUT', path)).status, 401);

  await call('PUT', path, { cookie: buyer.cookie });
  let res = await call('PUT', path, { cookie: buyer.cookie });
  assert.deepEqual(res.data, [itemId], 'saving twice keeps one entry');

  res = await call('GET', '/api/users/me/favourites', { cookie: buyer.cookie });
  assert.deepEqual(
    res.data.map((item) => item.title),
    ['Paneer Thali Deluxe']
  );
  res = await call('GET', '/api/users/me/favourites', { cookie: voter.cookie });
  assert.deepEqual(res.data, [], "another user's list is separate");

  res = await call('PUT', `/api/users/me/favourites/${newId()}`, { cookie: buyer.cookie });
  assert.equal(res.status, 404);
  res = await call('PUT', '/api/users/me/favourites/not-an-id', { cookie: buyer.cookie });
  assert.equal(res.status, 404);

  res = await call('GET', `/api/users/${buyer.id}`);
  assert.equal('favourites' in res.data, false, 'not part of the public profile');

  res = await call('DELETE', path, { cookie: buyer.cookie });
  assert.deepEqual(res.data, []);
});

test('seller stats and earnings come from real orders', async () => {
  let stats = (await call('GET', `/api/users/${seller.id}/stats`)).data;
  assert.equal(stats.items, 1);
  assert.equal(stats.ordersDelivered, 0);
  assert.equal(stats.rating, null);
  assert.equal(stats.lastDeliveryAt, null);
  assert.ok(Date.parse(stats.memberSince) > 0);

  // One delivered (2 x 280), one still on its way (280), one cancelled.
  const delivered = await paidOrder(buyer, itemId, { ...sampleCheckout, quantity: 2 });
  for (const status of ['accepted', 'preparing', 'out_for_delivery', 'delivered']) {
    assert.equal((await setStatus(delivered, status)).status, 200);
  }
  await paidOrder(voter);
  const cancelled = await paidOrder(voter);
  await call('POST', `/api/orders/${cancelled}/cancel`, { cookie: voter.cookie });

  const summary = await call('GET', '/api/orders/summary', { cookie: seller.cookie });
  assert.equal(summary.status, 200);
  const { topItems, ...totals } = summary.data;
  assert.deepEqual(totals, { earned: 560, inProgress: 280, delivered: 1, active: 1, cancelled: 1 });
  assert.deepEqual(topItems, [{ itemId, title: 'Paneer Thali Deluxe', portions: 3, total: 840 }]);
  assert.equal((await call('GET', '/api/orders/summary')).status, 401);

  const buyerSummary = await call('GET', '/api/orders/summary', { cookie: buyer.cookie });
  assert.equal(buyerSummary.data.earned, 0, 'only orders you sold count');

  stats = (await call('GET', `/api/users/${seller.id}/stats`)).data;
  assert.equal(stats.ordersDelivered, 1);
  assert.ok(Date.parse(stats.lastDeliveryAt) > 0);
  assert.equal((await call('GET', `/api/users/${newId()}/stats`)).status, 404);
});

test('helpful votes on reviews', async () => {
  const created = await call('POST', '/api/reviews', {
    cookie: buyer.cookie,
    body: { itemId, desc: 'Generous portions', star: 4 },
  });
  assert.equal(created.status, 201);
  const reviewId = created.data._id;
  const vote = (cookie, helpful) =>
    call('POST', `/api/reviews/${reviewId}/vote`, { cookie, body: { helpful } });
  const counts = (res) => [res.data.helpfulCount, res.data.notHelpfulCount, res.data.myVote];

  assert.equal((await vote(undefined, true)).status, 401);
  assert.equal((await vote(buyer.cookie, true)).status, 400, 'not on your own review');
  assert.equal((await vote(voter.cookie, 'yes')).status, 400);
  assert.equal(
    (
      await call('POST', `/api/reviews/${newId()}/vote`, {
        cookie: voter.cookie,
        body: { helpful: true },
      })
    ).status,
    404
  );

  assert.deepEqual(counts(await vote(voter.cookie, true)), [1, 0, true]);
  assert.deepEqual(
    counts(await vote(voter.cookie, true)),
    [1, 0, true],
    'voting twice counts once'
  );
  assert.deepEqual(counts(await vote(otherSeller.cookie, false)), [1, 1, false]);
  assert.deepEqual(counts(await vote(voter.cookie, false)), [0, 2, false], 'a vote can be changed');
  assert.deepEqual(counts(await vote(voter.cookie, null)), [0, 1, null], 'or taken back');

  // Readers get counts and their own vote, never the list of voters.
  const anonymous = (await call('GET', `/api/reviews/${itemId}`)).data[0];
  assert.deepEqual(
    [anonymous.helpfulCount, anonymous.notHelpfulCount, anonymous.myVote],
    [0, 1, null]
  );
  assert.equal('helpful' in anonymous, false);
  assert.equal('notHelpful' in anonymous, false);
  const mine = (await call('GET', `/api/reviews/${itemId}`, { cookie: otherSeller.cookie }))
    .data[0];
  assert.equal(mine.myVote, false);

  const stats = (await call('GET', `/api/users/${seller.id}/stats`)).data;
  assert.deepEqual([stats.rating, stats.reviews], [4, 1]);
});

test('two people share one conversation whoever starts it', async () => {
  const start = (from, to) =>
    call('POST', '/api/conversations', { cookie: from.cookie, body: { to: to.id } });
  const listed = async (user) =>
    (await call('GET', '/api/conversations', { cookie: user.cookie })).data.map((c) => c.id);

  // Seller to seller: both are "sellers", so the roles alone cannot tell them apart.
  const first = await start(otherSeller, seller);
  assert.equal(first.status, 201);
  const again = await start(seller, otherSeller);
  assert.equal(again.status, 200);
  assert.equal(again.data.id, first.data.id);
  assert.deepEqual(await listed(seller), [first.data.id]);
  assert.deepEqual(await listed(otherSeller), [first.data.id]);

  // Buyer and seller, started from either side.
  const fromBuyer = await start(buyer, seller);
  const fromSeller = await start(seller, buyer);
  assert.equal(fromSeller.data.id, fromBuyer.data.id);
  assert.equal((await listed(seller)).length, 2);
  assert.deepEqual(await listed(voter), []);
});
