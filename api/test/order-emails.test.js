// Emails about orders: who is told what, and that email trouble never breaks an order.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient, sampleCheckout, sampleItem } from './support/client.js';
import { markSucceeded } from './support/fake-stripe.js';
import { CLIENT_ORIGIN, startTestServer } from './support/server.js';

const { deliveryAddress } = sampleCheckout;
const BUYER = 'stefan@example.com';
const COOK = 'albert@example.com';

let server, db, call, register, outbox;
let seller, buyer, thali, burger;

const addItem = async (body) =>
  (await call('POST', '/api/items', { cookie: seller.cookie, body: { ...sampleItem, ...body } }))
    .data._id;

// Places and pays for an order; resolves to the stored order.
const order = async (items) => {
  const res = await call('POST', '/api/orders/checkout', {
    cookie: buyer.cookie,
    body: { items, deliveryAddress },
  });
  const intentId = res.data.clientSecret.split('_secret')[0];
  markSucceeded(intentId);
  const confirm = () =>
    call('PUT', '/api/orders', { cookie: buyer.cookie, body: { payment_intent: intentId } });
  assert.equal((await confirm()).status, 200);
  return { stored: await db.collection('orders').findOne({ payment_intent: intentId }), confirm };
};

// Emails sent since `from`, as "address: subject".
const sentSince = (from) => outbox.slice(from).map((mail) => `${mail.to}: ${mail.subject}`);
const refOf = (stored) => `#${String(stored._id).slice(-6).toUpperCase()}`;

before(async () => {
  server = await startTestServer();
  db = server.db;
  ({ call, register } = createClient(server.baseUrl));
  ({ outbox } = await import('../utils/mailer.js'));
  seller = await register('albert', true);
  buyer = await register('stefan');
  thali = await addItem({ title: 'Paneer Thali', price: 250 });
  burger = await addItem({ title: 'Veg <b>Burger</b>', price: 120 });
});

after(() => server.stop());

test('a paid order emails a receipt to the buyer and the order to the cook, once', async () => {
  const start = outbox.length;
  const { stored, confirm } = await order([
    { itemId: thali, quantity: 2 },
    { itemId: burger, quantity: 1 },
  ]);
  const ref = refOf(stored);

  assert.deepEqual(sentSince(start).sort(), [
    `${COOK}: New order ${ref}: Paneer Thali + 1 more`,
    `${BUYER}: Order ${ref} placed: Paneer Thali + 1 more`,
  ]);

  const receipt = outbox.slice(start).find((mail) => mail.to === BUYER);
  assert.match(receipt.text, /2 x Paneer Thali {2}₹ 500/);
  assert.match(receipt.text, /Total: ₹ 620/);
  assert.match(receipt.text, /12 Marine Drive, Flat 4B, Mumbai 400002/);
  assert.ok(receipt.text.includes(`${CLIENT_ORIGIN}/orders`), 'links point at the client');
  // What users typed is escaped in the HTML version.
  assert.ok(receipt.html.includes('Veg &lt;b&gt;Burger&lt;/b&gt;'));
  assert.equal(receipt.html.includes('<b>Burger</b>'), false);

  const forCook = outbox.slice(start).find((mail) => mail.to === COOK);
  assert.match(forCook.text, /stefan has paid/);
  assert.match(forCook.text, /Phone: \+91 98765 43210/);
  assert.match(forCook.text, /Note for the cook: Ring the bell twice/);

  // Confirming again (the success page reloaded, or the Stripe webhook arriving as well)
  // sends nothing more.
  assert.equal((await confirm()).status, 200);
  assert.equal(outbox.length, start + 2);
});

test('the buyer is told each time the cook moves the order forward', async () => {
  const { stored } = await order([{ itemId: thali, quantity: 1 }]);
  const ref = refOf(stored);
  const start = outbox.length;

  for (const status of ['accepted', 'preparing', 'out_for_delivery', 'delivered']) {
    const res = await call('PATCH', `/api/orders/${stored._id}/status`, {
      cookie: seller.cookie,
      body: { status },
    });
    assert.equal(res.status, 200);
  }
  assert.deepEqual(sentSince(start), [
    `${BUYER}: Order ${ref} was accepted`,
    `${BUYER}: Order ${ref} is being prepared`,
    `${BUYER}: Order ${ref} is on its way`,
    `${BUYER}: Order ${ref} was delivered`,
  ]);
  assert.ok(outbox.at(-1).text.includes(`Leave a review: ${CLIENT_ORIGIN}/item/${thali}`));

  // A step that is refused sends nothing.
  await call('PATCH', `/api/orders/${stored._id}/status`, {
    cookie: seller.cookie,
    body: { status: 'accepted' },
  });
  assert.equal(outbox.length, start + 4);
});

test('a cancelled order tells both sides, with the refund and the reason', async () => {
  const { stored } = await order([{ itemId: thali, quantity: 1 }]);
  const ref = refOf(stored);
  const start = outbox.length;
  const cancel = () =>
    call('POST', `/api/orders/${stored._id}/cancel`, {
      cookie: seller.cookie,
      body: { reason: 'Out of paneer today' },
    });

  assert.equal((await cancel()).status, 200);
  assert.deepEqual(sentSince(start).sort(), [
    `${COOK}: Order ${ref} was cancelled`,
    `${BUYER}: Order ${ref} cancelled and refunded`,
  ]);
  const toBuyer = outbox.slice(start).find((mail) => mail.to === BUYER);
  assert.match(toBuyer.text, /The cook cancelled this order/);
  assert.match(toBuyer.text, /₹ 250 is being refunded/);
  assert.match(toBuyer.text, /Reason: Out of paneer today/);
  assert.match(outbox.slice(start).find((mail) => mail.to === COOK).text, /You cancelled/);

  // Cancelling twice does not email twice.
  await cancel();
  assert.equal(outbox.length, start + 2);
});

test('an order still goes through when someone on it can no longer be emailed', async () => {
  const lost = await register('lost');
  const res = await call('POST', '/api/orders/checkout', {
    cookie: lost.cookie,
    body: { items: [{ itemId: thali, quantity: 1 }], deliveryAddress },
  });
  const intentId = res.data.clientSecret.split('_secret')[0];
  markSucceeded(intentId);
  // The buyer's account disappears between paying and the confirmation.
  await db.collection('users').deleteOne({ username: 'lost' });
  const start = outbox.length;

  const confirmed = await call('PUT', '/api/orders', {
    cookie: lost.cookie,
    body: { payment_intent: intentId },
  });
  assert.equal(confirmed.status, 200);
  const stored = await db.collection('orders').findOne({ payment_intent: intentId });
  assert.equal(stored.isPaid, true);
  assert.deepEqual(sentSince(start), [`${COOK}: New order ${refOf(stored)}: Paneer Thali`]);
});
