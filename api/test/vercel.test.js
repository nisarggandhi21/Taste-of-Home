// Guards the Vercel deployment: there the platform imports this module and calls its default
// export for every request, so the module must load cleanly, must not open a port itself,
// and the exported app must be able to serve requests on its own.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { createClient } from './support/client.js';
import { startTestServer } from './support/server.js';

let server, platform, call;

before(async () => {
  server = await startTestServer({ env: { VERCEL: '1' } });
  // Stand-in for the platform: hand each incoming request to the exported app.
  platform = http.createServer(server.app).listen(0);
  await once(platform, 'listening');
  call = createClient(`http://localhost:${platform.address().port}`).call;
});

after(async () => {
  await new Promise((resolve) => platform.close(resolve));
  await server.stop();
});

test('the module exports an app and does not listen by itself', () => {
  assert.equal(typeof server.app, 'function');
  assert.equal(server.httpServer.listening, false);
});

test('the exported app serves requests', async () => {
  assert.equal((await call('GET', '/')).status, 200);
  const items = await call('GET', '/api/items');
  assert.equal(items.status, 200);
  assert.deepEqual(items.data.items, []);
});

test('auth works behind the platform proxy', async () => {
  assert.equal(server.app.get('trust proxy'), 1);
  // Vercel forwards the visitor address in this header; the rate limiter must accept it.
  const headers = { 'X-Forwarded-For': '203.0.113.7' };
  const registered = await call('POST', '/api/auth/register', {
    headers,
    body: { username: 'vercel-user', email: 'vercel@example.com', password: 'secret123' },
  });
  assert.equal(registered.status, 201);
  const login = await call('POST', '/api/auth/login', {
    headers,
    body: { username: 'vercel-user', password: 'secret123' },
  });
  assert.equal(login.status, 200);
});
