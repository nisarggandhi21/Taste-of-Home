// Cart checkout: one order holding several dishes from one cook.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import { createClient, sampleCheckout, sampleItem } from './support/client.js';
import { markSucceeded, paymentIntents, refunds } from './support/fake-stripe.js';
import { startTestServer } from './support/server.js';

const newId = () => String(new mongoose.Types.ObjectId());
const { deliveryAddress } = sampleCheckout;

let server, db, call, register;
let seller, otherSeller, buyer;
let thali, burger, paused, biryani;

const addItem = async (owner, body) =>
  (await call('POST', '/api/items', { cookie: owner.cookie, body: { ...sampleItem, ...body } }))
    .data._id;
const checkout = (items, cookie = buyer.cookie, address = deliveryAddress) =>
  call('POST', '/api/orders/checkout', { cookie, body: { items, deliveryAddress: address } });
const sales = async (id) => (await call('GET', `/api/items/single/${id}`)).data.sales;
const pay = async (res, user = buyer) => {
  const intentId = res.data.clientSecret.split('_secret')[0];
  markSucceeded(intentId);
  await call('PUT', '/api/orders', { cookie: user.cookie, body: { payment_intent: intentId } });
  return db.collection('orders').findOne({ payment_intent: intentId });
};

before(async () => {
  server = await startTestServer();
  db = server.db;
  ({ call, register } = createClient(server.baseUrl));
  seller = await register('albert', true);
  otherSeller = await register('berta', true);
  buyer = await register('stefan');
  thali = await addItem(seller, { title: 'Paneer Thali', price: 250 });
  burger = await addItem(seller, { title: 'Veg Burger', price: 120 });
  paused = await addItem(seller, { title: 'Paused Dish', price: 99 });
  await call('PATCH', `/api/items/${paused}/availability`, {
    cookie: seller.cookie,
    body: { isAvailable: false },
  });
  biryani = await addItem(otherSeller, { title: 'Chicken Biryani', price: 300 });
});

after(() => server.stop());

test('a cart is checked before anything is charged', async () => {
  const one = [{ itemId: thali, quantity: 1 }];

  assert.equal((await checkout(one, null)).status, 401);
  assert.equal((await checkout([])).status, 400);
  assert.equal((await checkout(undefined)).status, 400);
  assert.equal((await checkout([{ itemId: thali, quantity: 0 }])).status, 400);
  assert.equal((await checkout([{ itemId: thali, quantity: 21 }])).status, 400);
  assert.equal((await checkout([{ itemId: 'nope', quantity: 1 }])).status, 400);
  assert.equal((await checkout([{ itemId: { $ne: null }, quantity: 1 }])).status, 400);
  assert.equal(
    (await checkout(one, buyer.cookie, { ...deliveryAddress, pincode: '1' })).status,
    400
  );
  assert.equal((await checkout([{ itemId: newId(), quantity: 1 }])).status, 404);

  const twice = await checkout([
    { itemId: thali, quantity: 1 },
    { itemId: thali, quantity: 2 },
  ]);
  assert.equal(twice.status, 400);
  assert.match(twice.data.message, /twice/);

  const mixed = await checkout([
    { itemId: thali, quantity: 1 },
    { itemId: biryani, quantity: 1 },
  ]);
  assert.equal(mixed.status, 400);
  assert.match(mixed.data.message, /one cook/);

  const unavailable = await checkout([
    { itemId: thali, quantity: 1 },
    { itemId: paused, quantity: 1 },
  ]);
  assert.equal(unavailable.status, 400);
  assert.match(unavailable.data.message, /Paused Dish is not available/);

  const own = await checkout(one, seller.cookie);
  assert.equal(own.status, 400);

  assert.equal(await db.collection('orders').countDocuments(), 0, 'no order was created');
  assert.equal(paymentIntents.size, 0, 'and nothing was sent to Stripe');
});

test('a cart becomes one order with a line per dish', async () => {
  // A price sent by the browser is ignored; the server uses its own.
  const res = await checkout([
    { itemId: thali, quantity: 2, price: 1 },
    { itemId: burger, quantity: 3 },
  ]);
  assert.equal(res.status, 200);
  assert.equal(res.data.total, 2 * 250 + 3 * 120);

  const intent = paymentIntents.get(res.data.clientSecret.split('_secret')[0]);
  assert.equal(intent.amount, 86000);
  assert.equal(intent.description, 'Paneer Thali x 2, Veg Burger x 3');

  const stored = await pay(res);
  assert.equal(stored.sellerId, seller.id);

  const listed = (await call('GET', '/api/orders', { cookie: seller.cookie })).data[0];
  assert.equal(listed.status, 'placed');
  assert.equal(listed.price, 860);
  assert.equal(listed.quantity, 5);
  assert.equal(listed.title, 'Paneer Thali + 1 more');
  assert.deepEqual(
    listed.lines.map((line) => [line.title, line.unitPrice, line.quantity]),
    [
      ['Paneer Thali', 250, 2],
      ['Veg Burger', 120, 3],
    ]
  );
  assert.equal(listed.deliveryAddress.city, 'Mumbai');

  assert.deepEqual([await sales(thali), await sales(burger)], [2, 3], 'each dish counts its sales');
});

test('every dish on a paid order can be reviewed', async () => {
  for (const itemId of [thali, burger]) {
    const res = await call('POST', '/api/reviews', {
      cookie: buyer.cookie,
      body: { itemId, desc: 'Good', star: 5 },
    });
    assert.equal(res.status, 201);
  }
  const notOrdered = await call('POST', '/api/reviews', {
    cookie: buyer.cookie,
    body: { itemId: biryani, desc: 'Never had it', star: 1 },
  });
  assert.equal(notOrdered.status, 403);
});

test('earnings and cancellation work per dish', async () => {
  const summary = (await call('GET', '/api/orders/summary', { cookie: seller.cookie })).data;
  assert.equal(summary.inProgress, 860);
  assert.deepEqual(summary.topItems, [
    { itemId: thali, title: 'Paneer Thali', portions: 2, total: 500 },
    { itemId: burger, title: 'Veg Burger', portions: 3, total: 360 },
  ]);

  const [order] = await db.collection('orders').find().toArray();
  const cancelled = await call('POST', `/api/orders/${order._id}/cancel`, { cookie: buyer.cookie });
  assert.equal(cancelled.status, 200);
  assert.equal(refunds.at(-1).amount, 86000, 'the whole order is refunded');
  assert.deepEqual([await sales(thali), await sales(burger)], [0, 0], 'sales are taken back');
});

test('ordering one dish still works and is stored the same way', async () => {
  const res = await call('POST', `/api/orders/create-payment-intent/${biryani}`, {
    cookie: buyer.cookie,
    body: { quantity: 2, deliveryAddress },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.total, 600);
  await pay(res);

  const listed = (await call('GET', '/api/orders', { cookie: buyer.cookie })).data[0];
  assert.equal(listed.title, 'Chicken Biryani');
  assert.equal(listed.unitPrice, 300);
  assert.deepEqual(
    listed.lines.map((line) => [line.title, line.unitPrice, line.quantity]),
    [['Chicken Biryani', 300, 2]]
  );
});

test('orders from before carts existed still show their dish as a line', async () => {
  await db.collection('orders').insertOne({
    itemId: thali,
    title: 'Old Thali Order',
    price: 500,
    quantity: 2,
    sellerId: seller.id,
    buyerId: buyer.id,
    isPaid: true,
    payment_intent: 'pi_before_carts',
    createdAt: new Date(0),
  });
  const orders = (await call('GET', '/api/orders', { cookie: buyer.cookie })).data;
  const old = orders.find((order) => order.title === 'Old Thali Order');
  assert.deepEqual(old.lines, [
    { itemId: thali, title: 'Old Thali Order', unitPrice: 250, quantity: 2 },
  ]);
});
