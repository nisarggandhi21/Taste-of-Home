// What the API does when the database is slow to connect, fails to connect, or drops out:
// the situations behind "Operation `users.findOne()` buffering timed out".
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { createClient } from './support/client.js';

const UNAVAILABLE = 'We could not reach the database just now. Please try again.';

let mongod, httpServer, call;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Asks again until the API answers 200, or fails after ten seconds.
const eventuallyOk = async (path) => {
  for (let i = 0; i < 50; i++) {
    const res = await call('GET', path);
    if (res.status === 200) return res;
    await wait(200);
  }
  assert.fail(`${path} never recovered`);
};
const assertUnavailable = (res) => {
  assert.equal(res.status, 503);
  assert.equal(res.data.message, UNAVAILABLE);
  // Nothing about the inside of the server reaches the visitor.
  assert.doesNotMatch(JSON.stringify(res.data), /buffering|findOne|Mongo|ECONNREFUSED/i);
};

before(async () => {
  // Reserve an address for the database, then take the database away again: the API starts
  // while it is unreachable, like a cold start that coincides with a connection problem.
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('tasteofhome_test');
  await mongod.stop({ doCleanup: false });

  Object.assign(process.env, {
    MONGO: uri,
    JWT_KEY: 'test-jwt-key',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
    PORT: '0',
    NODE_ENV: 'test',
    DB_WAIT_MS: '700',
  });
  ({ httpServer } = await import('../index.js'));
  if (!httpServer.listening) await once(httpServer, 'listening');
  ({ call } = createClient(`http://localhost:${httpServer.address().port}`));
});

after(async () => {
  httpServer.closeAllConnections();
  await new Promise((resolve) => httpServer.close(resolve));
  const { default: mongoose } = await import('mongoose');
  await mongoose.disconnect();
  await mongod.stop();
});

test('with the database unreachable, requests get a clear answer quickly', async () => {
  const started = Date.now();
  assertUnavailable(await call('GET', '/api/items'));
  assert.ok(Date.now() - started < 3000, 'answered well before the host would give up');

  // Logging in is what showed the raw error on the live site.
  assertUnavailable(
    await call('POST', '/api/auth/login', { body: { username: 'maya', password: 'secret123' } })
  );
  assertUnavailable(await call('GET', '/sitemap.xml'));
  // What does not need the database still answers.
  assert.equal((await call('GET', '/')).status, 200);
  assert.equal((await call('GET', '/robots.txt')).status, 200);
});

test('a failed first connection is tried again instead of staying broken', async () => {
  await mongod.start(true);
  const items = await eventuallyOk('/api/items');
  assert.deepEqual(items.data.items, []);

  const registered = await call('POST', '/api/auth/register', {
    body: { username: 'maya', email: 'maya@example.com', password: 'secret123' },
  });
  assert.equal(registered.status, 201);
});

test('when the database drops out and comes back, so does the API', async () => {
  await mongod.stop({ doCleanup: false });
  assertUnavailable(await call('GET', '/api/items'));
  assertUnavailable(
    await call('POST', '/api/auth/login', { body: { username: 'maya', password: 'secret123' } })
  );

  await mongod.start(true);
  await eventuallyOk('/api/items');
  const login = await call('POST', '/api/auth/login', {
    body: { username: 'maya', password: 'secret123' },
  });
  assert.equal(login.status, 200, 'the account is still there and can log in');
});
