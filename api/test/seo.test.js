// The sitemap search engines read to find the dishes.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient, sampleItem } from './support/client.js';
import { CLIENT_ORIGIN, startTestServer } from './support/server.js';

let server, db, call, register;
let seller, thali, paused, removed;

const addItem = async (body) =>
  (await call('POST', '/api/items', { cookie: seller.cookie, body: { ...sampleItem, ...body } }))
    .data._id;
const addresses = (xml) => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

before(async () => {
  server = await startTestServer({ env: { ADMIN_EMAILS: 'root@example.com' } });
  db = server.db;
  ({ call, register } = createClient(server.baseUrl));
  seller = await register('albert', true);
  thali = await addItem({ title: 'Paneer Thali' });
  paused = await addItem({ title: 'Paused Dish' });
  await call('PATCH', `/api/items/${paused}/availability`, {
    cookie: seller.cookie,
    body: { isAvailable: false },
  });
  removed = await addItem({ title: 'Taken Down Dish' });
  const admin = await register('root');
  await db.collection('users').updateOne({ username: 'root' }, { $set: { emailVerified: true } });
  await call('POST', `/api/admin/items/${removed}/takedown`, {
    cookie: admin.cookie,
    body: { reason: 'Not food' },
  });
});

after(() => server.stop());

test('the sitemap lists the public pages and the dishes on sale, at the client address', async () => {
  const res = await fetch(`${server.baseUrl}/sitemap.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^application\/xml/);
  assert.match(res.headers.get('cache-control'), /max-age=3600/);
  const xml = await res.text();
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));

  const listed = addresses(xml);
  assert.ok(listed.every((address) => address.startsWith(`${CLIENT_ORIGIN}/`)));
  for (const path of ['/', '/items', '/about', '/privacy', '/items?cat=north']) {
    assert.ok(listed.includes(`${CLIENT_ORIGIN}${path}`), path);
  }
  assert.ok(listed.includes(`${CLIENT_ORIGIN}/item/${thali}`));
  // Dishes nobody can order are not advertised to search engines.
  assert.equal(listed.includes(`${CLIENT_ORIGIN}/item/${paused}`), false);
  assert.equal(listed.includes(`${CLIENT_ORIGIN}/item/${removed}`), false);
  // Nothing private.
  assert.equal(
    listed.some((address) => /orders|admin|profile|messages|login/.test(address)),
    false
  );

  // Each dish says when it last changed.
  const dish = xml.split('<url>').find((part) => part.includes(`/item/${thali}`));
  assert.match(dish, /<lastmod>\d{4}-\d{2}-\d{2}T[\d:.]+Z<\/lastmod>/);
});

test('a dish that comes back on sale comes back into the sitemap', async () => {
  await call('PATCH', `/api/items/${paused}/availability`, {
    cookie: seller.cookie,
    body: { isAvailable: true },
  });
  const xml = await (await fetch(`${server.baseUrl}/sitemap.xml`)).text();
  assert.ok(addresses(xml).includes(`${CLIENT_ORIGIN}/item/${paused}`));
});

test('the API tells search engines to leave everything but the sitemap alone', async () => {
  const res = await fetch(`${server.baseUrl}/robots.txt`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/plain/);
  assert.equal(await res.text(), 'User-agent: *\nAllow: /sitemap.xml\nDisallow: /\n');
});
