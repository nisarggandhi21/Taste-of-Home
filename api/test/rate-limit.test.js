// Login rate limiting. Runs in its own process so the counter starts at zero.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient } from './support/client.js';
import { startTestServer } from './support/server.js';

let server, call;
const login = (password) =>
  call('POST', '/api/auth/login', { body: { username: 'albert', password } });

before(async () => {
  server = await startTestServer();
  const client = createClient(server.baseUrl);
  call = client.call;
  await client.register('albert', true);
});

after(() => server.stop());

test('successful logins are never limited', async () => {
  for (let i = 0; i < 20; i++) assert.equal((await login('secret123')).status, 200);
});

test('failed logins are blocked after 10 attempts', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await login('wrong')).status, 400, `attempt ${i + 1}`);

  const blocked = await login('wrong');
  assert.equal(blocked.status, 429);
  assert.match(blocked.data.message, /Too many failed login attempts/);

  // The block covers the whole window, even with the right password.
  assert.equal((await login('secret123')).status, 429);

  const other = await call('GET', '/api/items');
  assert.equal(other.status, 200, 'the rest of the API is unaffected');
});
