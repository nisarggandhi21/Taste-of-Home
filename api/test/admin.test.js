// The admin role and what it can do: suspend accounts, take listings down, refund orders.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient, sampleCheckout, sampleItem } from './support/client.js';
import { markSucceeded, refunds } from './support/fake-stripe.js';
import { startTestServer } from './support/server.js';

const { deliveryAddress } = sampleCheckout;

let server, db, call, register, outbox;
let admin, seller, buyer;
let thali, burger, paused;

const as = (user) => ({
  get: (path) => call('GET', path, { cookie: user?.cookie }),
  post: (path, body) => call('POST', path, { cookie: user?.cookie, body }),
});
const addItem = async (owner, body) =>
  (await call('POST', '/api/items', { cookie: owner.cookie, body: { ...sampleItem, ...body } }))
    .data._id;
// Titles of the dishes a visitor can see, in alphabetical order.
const onSale = async () =>
  (await call('GET', '/api/items')).data.items.map((item) => item.title).sort();
const login = (username) =>
  call('POST', '/api/auth/login', { body: { username, password: 'secret123' } });
// Places and pays for an order from `who`; resolves to the stored order.
const order = async (itemId, who = buyer) => {
  const res = await call('POST', '/api/orders/checkout', {
    cookie: who.cookie,
    body: { items: [{ itemId, quantity: 1 }], deliveryAddress },
  });
  const intentId = res.data.clientSecret.split('_secret')[0];
  markSucceeded(intentId);
  await call('PUT', '/api/orders', { cookie: who.cookie, body: { payment_intent: intentId } });
  return db.collection('orders').findOne({ payment_intent: intentId });
};
const confirmEmail = (username) =>
  db.collection('users').updateOne({ username }, { $set: { emailVerified: true } });

before(async () => {
  server = await startTestServer({ env: { ADMIN_EMAILS: 'root@example.com, second@example.com' } });
  db = server.db;
  ({ call, register } = createClient(server.baseUrl));
  ({ outbox } = await import('../utils/mailer.js'));
  admin = await register('root');
  seller = await register('albert', true);
  buyer = await register('stefan');
  thali = await addItem(seller, { title: 'Paneer Thali', price: 250 });
  burger = await addItem(seller, { title: 'Veg Burger', price: 120 });
  paused = await addItem(seller, { title: 'Paused Dish', price: 99 });
  await call('PATCH', `/api/items/${paused}/availability`, {
    cookie: seller.cookie,
    body: { isAvailable: false },
  });
});

after(() => server.stop());

test('only a listed, confirmed account is an administrator', async () => {
  const me = (user) => call('GET', '/api/users/me', { cookie: user.cookie });

  // Listed, but the address is not confirmed yet: anybody could have registered it.
  assert.equal((await me(admin)).data.isAdmin, false);
  assert.equal((await as(admin).get('/api/admin/overview')).status, 404);

  await confirmEmail('root');
  assert.equal((await me(admin)).data.isAdmin, true);
  assert.equal((await as(admin).get('/api/admin/overview')).status, 200);
  assert.equal((await login('root')).data.isAdmin, true);

  // An address that differs only in capitals is a different account, and not an admin.
  const lookalike = await register('Root');
  await confirmEmail('Root');
  assert.equal((await me(lookalike)).data.isAdmin, false);

  // Everybody else gets "not found" on every admin route, and nothing changes.
  const routes = [
    ['get', '/api/admin/overview'],
    ['get', '/api/admin/users'],
    ['get', '/api/admin/items'],
    ['get', '/api/admin/orders'],
    ['get', '/api/admin/actions'],
    ['post', `/api/admin/users/${buyer.id}/suspend`],
    ['post', `/api/admin/users/${buyer.id}/unsuspend`],
    ['post', `/api/admin/items/${thali}/takedown`],
    ['post', `/api/admin/items/${thali}/restore`],
    ['post', `/api/admin/orders/${thali}/refund`],
  ];
  for (const [method, path] of routes) {
    for (const user of [seller, buyer, lookalike]) {
      assert.equal((await as(user)[method](path, { reason: 'because' })).status, 404, path);
    }
    assert.equal((await as(null)[method](path, { reason: 'because' })).status, 401, path);
  }
  assert.equal((await me(buyer)).data.isAdmin, false);
  assert.deepEqual(await onSale(), ['Paneer Thali', 'Veg Burger']);

  // An administrator account cannot be deleted while it is listed.
  const removal = await call('DELETE', `/api/users/${admin.id}`, {
    cookie: admin.cookie,
    body: { password: 'secret123' },
  });
  assert.equal(removal.status, 409);
});

test('the overview and the lists', async () => {
  const overview = (await as(admin).get('/api/admin/overview')).data;
  assert.equal(overview.users, 4);
  assert.equal(overview.sellers, 1);
  assert.equal(overview.suspended, 0);
  assert.equal(overview.listings, 2);
  assert.equal(overview.takenDown, 0);

  const users = (await as(admin).get('/api/admin/users')).data;
  assert.equal(users.total, 4);
  const albert = users.rows.find((row) => row.username === 'albert');
  assert.equal(albert.email, 'albert@example.com');
  assert.equal(albert.listings, 3);
  assert.equal('password' in albert, false);
  assert.equal(users.rows.find((row) => row.username === 'root').isAdmin, true);

  const found = (await as(admin).get('/api/admin/users?search=STEF')).data;
  assert.deepEqual(
    found.rows.map((row) => row.username),
    ['stefan']
  );
  // Search text is never read as a pattern.
  assert.equal((await as(admin).get('/api/admin/users?search=.*')).data.total, 0);
  assert.equal((await as(admin).get('/api/admin/users?page=0')).status, 400);

  const items = (await as(admin).get('/api/admin/items?search=burger')).data;
  assert.equal(items.rows.length, 1);
  assert.equal(items.rows[0].seller, 'albert');
});

test('taking a listing down hides it until it is restored', async () => {
  const takedown = (reason) => as(admin).post(`/api/admin/items/${burger}/takedown`, { reason });
  assert.equal((await takedown()).status, 400, 'a reason is required');
  assert.equal((await takedown('  ')).status, 400);
  assert.equal(
    (await as(admin).post('/api/admin/items/nope/takedown', { reason: 'x' })).status,
    400
  );

  const start = outbox.length;
  const down = await takedown('Photo is not of the dish');
  assert.equal(down.status, 200);
  assert.equal(down.data.isAvailable, false);
  assert.equal((await takedown('again')).status, 409);

  assert.deepEqual(await onSale(), ['Paneer Thali']);
  const blocked = await call('POST', '/api/orders/checkout', {
    cookie: buyer.cookie,
    body: { items: [{ itemId: burger, quantity: 1 }], deliveryAddress },
  });
  assert.equal(blocked.status, 400);

  // The seller is told why, by email and on their own listing; nobody else sees the reason.
  assert.match(outbox.at(-1).subject, /"Veg Burger" was taken down/);
  assert.equal(outbox.at(-1).to, 'albert@example.com');
  assert.match(outbox.at(-1).text, /Photo is not of the dish/);
  assert.equal(outbox.length, start + 1);
  const own = await call('GET', `/api/items?userId=${seller.id}`, { cookie: seller.cookie });
  assert.equal(
    own.data.items.find((item) => item.title === 'Veg Burger').takenDownReason,
    'Photo is not of the dish'
  );
  for (const cookie of [undefined, buyer.cookie]) {
    const seen = await call('GET', `/api/items/single/${burger}`, { cookie });
    assert.equal('takenDownReason' in seen.data, false);
  }
  assert.equal(
    (await call('GET', `/api/items/single/${burger}`, { cookie: seller.cookie })).data
      .takenDownReason,
    'Photo is not of the dish'
  );

  // The seller cannot put it back themselves.
  const retry = await call('PATCH', `/api/items/${burger}/availability`, {
    cookie: seller.cookie,
    body: { isAvailable: true },
  });
  assert.equal(retry.status, 403);
  assert.match(retry.data.message, /taken down by Taste of Home: Photo is not of the dish/);
  assert.deepEqual(await onSale(), ['Paneer Thali']);

  const restored = await as(admin).post(`/api/admin/items/${burger}/restore`);
  assert.equal(restored.status, 200);
  assert.equal(restored.data.isAvailable, true);
  assert.equal((await as(admin).post(`/api/admin/items/${burger}/restore`)).status, 409);
  assert.deepEqual(await onSale(), ['Paneer Thali', 'Veg Burger']);

  // A listing its seller had paused stays paused when a takedown is lifted.
  await as(admin).post(`/api/admin/items/${paused}/takedown`, { reason: 'Checking this one' });
  assert.equal((await as(admin).get('/api/admin/items?state=taken_down')).data.total, 1);
  await as(admin).post(`/api/admin/items/${paused}/restore`);
  assert.deepEqual(await onSale(), ['Paneer Thali', 'Veg Burger']);
});

test('suspending an account ends its sessions and hides its listings', async () => {
  const suspend = (id, reason) => as(admin).post(`/api/admin/users/${id}/suspend`, { reason });
  assert.equal((await suspend(seller.id)).status, 400, 'a reason is required');
  assert.equal((await suspend(admin.id, 'trying')).status, 400, 'not an administrator');
  assert.equal((await suspend('5'.repeat(24), 'nobody')).status, 404);

  const open = await order(thali);
  // One listing is taken down on its own while the seller is still active.
  await as(admin).post(`/api/admin/items/${burger}/takedown`, { reason: 'Reported twice' });

  const start = outbox.length;
  const suspended = await suspend(seller.id, 'Sold food that was not homemade');
  assert.equal(suspended.status, 200);
  assert.equal(suspended.data.openOrders, 1, 'the administrator is told about orders still owed');
  assert.equal((await suspend(seller.id, 'again')).status, 409);
  assert.match(outbox.slice(start).at(-1).subject, /suspended/);
  assert.match(outbox.slice(start).at(-1).text, /Sold food that was not homemade/);

  // The session they already had stops working, and they cannot log in again.
  assert.equal((await call('GET', '/api/users/me', { cookie: seller.cookie })).status, 401);
  assert.equal((await addItem(seller, { title: 'Sneaky' }).catch(() => null)) ?? null, null);
  const refused = await login('albert');
  assert.equal(refused.status, 403);
  assert.match(refused.data.message, /suspended.*Sold food that was not homemade/);
  assert.equal(refused.setCookie, null);
  // A wrong password still gets the usual answer, so suspension is not revealed to strangers.
  const wrong = await call('POST', '/api/auth/login', {
    body: { username: 'albert', password: 'wrong-password' },
  });
  assert.equal(wrong.status, 400);

  assert.deepEqual(await onSale(), []);
  const blocked = await call('POST', '/api/orders/checkout', {
    cookie: buyer.cookie,
    body: { items: [{ itemId: thali, quantity: 1 }], deliveryAddress },
  });
  assert.equal(blocked.status, 400);
  assert.equal((await as(admin).get('/api/admin/users?state=suspended')).data.total, 1);
  assert.equal((await as(admin).get('/api/admin/overview')).data.suspended, 1);

  // The order they still owed is the administrator's to settle.
  const refunded = await as(admin).post(`/api/admin/orders/${open._id}/refund`, {
    reason: 'Cook was suspended',
  });
  assert.equal(refunded.status, 200);

  // Restoring the listing while its seller is suspended does not put it on sale.
  await as(admin).post(`/api/admin/items/${burger}/restore`);
  assert.deepEqual(await onSale(), []);

  const lifted = await as(admin).post(`/api/admin/users/${seller.id}/unsuspend`);
  assert.equal(lifted.status, 200);
  assert.equal((await as(admin).post(`/api/admin/users/${seller.id}/unsuspend`)).status, 409);
  assert.match(outbox.at(-1).subject, /active again/);
  // Everything that was on sale is back; the dish the seller paused is still paused.
  assert.deepEqual(await onSale(), ['Paneer Thali', 'Veg Burger']);
  assert.equal((await call('GET', '/api/users/me', { cookie: seller.cookie })).status, 200);
  assert.equal((await login('albert')).status, 200);
});

test('an administrator can refund any paid order', async () => {
  const delivered = await order(thali);
  for (const status of ['accepted', 'preparing', 'out_for_delivery', 'delivered']) {
    await call('PATCH', `/api/orders/${delivered._id}/status`, {
      cookie: seller.cookie,
      body: { status },
    });
  }
  // Neither side can cancel a delivered order themselves.
  const self = await call('POST', `/api/orders/${delivered._id}/cancel`, { cookie: buyer.cookie });
  assert.equal(self.status, 400);

  const refund = (id, reason) => as(admin).post(`/api/admin/orders/${id}/refund`, { reason });
  assert.equal((await refund(delivered._id)).status, 400, 'a reason is required');
  assert.equal((await refund('5'.repeat(24), 'nothing there')).status, 404);

  const refundsBefore = refunds.length;
  const start = outbox.length;
  const salesBefore = (await call('GET', `/api/items/single/${thali}`)).data.sales;
  const done = await refund(delivered._id, 'Buyer reported the food arrived spoiled');
  assert.equal(done.status, 200);
  assert.equal(done.data.status, 'cancelled');
  assert.equal(done.data.cancelledBy, 'admin');
  assert.equal(done.data.buyer, 'stefan');
  assert.equal(refunds.length, refundsBefore + 1);
  assert.equal(refunds.at(-1).amount, 25000);
  assert.equal((await call('GET', `/api/items/single/${thali}`)).data.sales, salesBefore - 1);

  const mails = outbox.slice(start);
  assert.equal(mails.length, 2);
  const toBuyer = mails.find((mail) => mail.to === 'stefan@example.com');
  assert.match(toBuyer.text, /Taste of Home cancelled this order/);
  assert.match(toBuyer.text, /Reason: Buyer reported the food arrived spoiled/);

  // Once only.
  assert.equal((await refund(delivered._id, 'again')).status, 409);
  assert.equal(refunds.length, refundsBefore + 1);

  // A checkout that was never paid has nothing to refund.
  const unpaid = await call('POST', '/api/orders/checkout', {
    cookie: buyer.cookie,
    body: { items: [{ itemId: thali, quantity: 1 }], deliveryAddress },
  });
  const pending = await db
    .collection('orders')
    .findOne({ payment_intent: unpaid.data.clientSecret.split('_secret')[0] });
  assert.equal((await refund(pending._id, 'not paid')).status, 400);

  // The seller no longer counts it as earned.
  const summary = await call('GET', '/api/orders/summary', { cookie: seller.cookie });
  assert.equal(summary.data.earned, 0);

  // Orders can be found by the reference in the emails, by a person, and by status.
  const ref = String(delivered._id).slice(-6).toUpperCase();
  const byRef = (await as(admin).get(`/api/admin/orders?search=%23${ref}`)).data;
  assert.equal(byRef.total, 1);
  assert.equal(byRef.rows[0].ref, `#${ref}`);
  const all = (await as(admin).get('/api/admin/orders')).data;
  assert.equal(all.total, 2, 'unpaid checkouts are not listed');
  assert.equal((await as(admin).get('/api/admin/orders?search=stefan')).data.total, 2);
  assert.equal((await as(admin).get('/api/admin/orders?search=nobody')).data.total, 0);
  assert.equal((await as(admin).get('/api/admin/orders?state=cancelled')).data.total, 2);
  assert.equal((await as(admin).get('/api/admin/orders?state=placed')).data.total, 0);

  const overview = (await as(admin).get('/api/admin/overview')).data;
  assert.deepEqual(overview.orders, {
    open: 0,
    delivered: 0,
    cancelled: 2,
    paid: 0,
    refunded: 500,
  });
});

test('everything an administrator did is on record', async () => {
  const log = (await as(admin).get('/api/admin/actions')).data;
  const summary = log.rows.map((row) => `${row.action} ${row.targetLabel}`).reverse();
  assert.deepEqual(summary.slice(0, 5), [
    'take_down_item Veg Burger',
    'restore_item Veg Burger',
    'take_down_item Paused Dish',
    'restore_item Paused Dish',
    'take_down_item Veg Burger',
  ]);
  assert.ok(summary.includes('suspend_user albert'));
  assert.ok(summary.includes('unsuspend_user albert'));
  assert.ok(summary.some((line) => /^refund_order #[0-9A-F]{6} Paneer Thali$/.test(line)));
  const suspension = log.rows.find((row) => row.action === 'suspend_user');
  assert.equal(suspension.adminName, 'root');
  assert.equal(suspension.reason, 'Sold food that was not homemade');
  assert.equal((await as(admin).get('/api/admin/overview')).data.recent.length, 5);
});
