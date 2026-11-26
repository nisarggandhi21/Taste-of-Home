// Account features: own profile, email verification, password reset and change.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient } from './support/client.js';
import { CLIENT_ORIGIN, startTestServer } from './support/server.js';

let server, db, call, register, outbox;
let user;

const login = (username, password) =>
  call('POST', '/api/auth/login', { body: { username, password } });
// The token inside the newest email sent to an address.
const tokenFrom = (to, path) => {
  const mail = outbox.filter((message) => message.to === to).at(-1);
  assert.ok(mail, `an email was sent to ${to}`);
  const link = mail.text.split('\n').find((line) => line.includes(path));
  assert.ok(link.startsWith(`${CLIENT_ORIGIN}${path}?token=`), 'the link points at the client');
  return link.split('token=')[1];
};
const stored = () => db.collection('users').findOne({ username: 'maya' });

before(async () => {
  server = await startTestServer();
  db = server.db;
  ({ call, register } = createClient(server.baseUrl));
  ({ outbox } = await import('../utils/mailer.js'));
  user = await register('maya');
});

after(() => server.stop());

test('responses about your own account never include secrets', async () => {
  const me = await call('GET', '/api/users/me', { cookie: user.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.data.email, 'maya@example.com');
  assert.equal(me.data.emailVerified, false);

  const secret = ['password', 'emailVerifyTokenHash', 'resetTokenHash', 'resetExpires'];
  const loggedIn = await login('maya', 'secret123');
  for (const response of [me.data, user.res.data, loggedIn.data]) {
    for (const field of secret) assert.equal(field in response, false, field);
  }
  assert.equal((await call('GET', '/api/users/me')).status, 401);
});

test('email verification', async () => {
  const token = tokenFrom('maya@example.com', '/verify-email');
  const verify = (value) => call('POST', '/api/auth/verify-email', { body: { token: value } });

  // Only a hash of the token is stored.
  const before = await stored();
  assert.notEqual(before.emailVerifyTokenHash, token);
  assert.equal(JSON.stringify(before).includes(token), false);

  assert.equal((await verify('x'.repeat(64))).status, 400);
  assert.equal((await verify({ $ne: null })).status, 400);
  assert.equal((await verify(token)).status, 200);
  assert.equal(
    (await call('GET', '/api/users/me', { cookie: user.cookie })).data.emailVerified,
    true
  );
  assert.equal((await verify(token)).status, 400, 'a link works once');

  const resend = await call('POST', '/api/auth/resend-verification', { cookie: user.cookie });
  assert.match(resend.data.message, /already confirmed/);
  assert.equal((await call('POST', '/api/auth/resend-verification')).status, 401);
});

test('an expired verification link is refused and a new one can be requested', async () => {
  const late = await register('late');
  await db
    .collection('users')
    .updateOne({ username: 'late' }, { $set: { emailVerifyExpires: new Date(Date.now() - 1000) } });
  const expired = tokenFrom('late@example.com', '/verify-email');
  let res = await call('POST', '/api/auth/verify-email', { body: { token: expired } });
  assert.equal(res.status, 400);

  res = await call('POST', '/api/auth/resend-verification', { cookie: late.cookie });
  assert.equal(res.status, 200);
  const fresh = tokenFrom('late@example.com', '/verify-email');
  assert.notEqual(fresh, expired);
  res = await call('POST', '/api/auth/verify-email', { body: { token: fresh } });
  assert.equal(res.status, 200);
});

test('editing your own profile', async () => {
  const patch = (body, cookie = user.cookie) => call('PATCH', '/api/users/me', { cookie, body });

  assert.equal((await patch({ location: 'Goa' }, null)).status, 401);
  assert.equal((await patch({ img: 'not-a-url' })).status, 400);

  // Fields that are not yours to change are ignored.
  const res = await patch({
    location: 'Goa',
    desc: 'Weekend baker',
    phone: '+91 99999 00000',
    isSeller: true,
    email: 'other@example.com',
    emailVerified: false,
    password: 'x',
  });
  assert.equal(res.status, 200);
  assert.deepEqual(
    [res.data.location, res.data.desc, res.data.phone],
    ['Goa', 'Weekend baker', '+91 99999 00000']
  );
  assert.equal(res.data.isSeller, false);
  assert.equal(res.data.email, 'maya@example.com');
  assert.equal(res.data.emailVerified, true);
  assert.equal((await login('maya', 'secret123')).status, 200, 'password unchanged');

  // The public profile shows the new location but still no contact details.
  const profile = (await call('GET', `/api/users/${user.id}`)).data;
  assert.equal(profile.location, 'Goa');
  assert.equal('phone' in profile, false);

  assert.equal((await patch({ desc: '' })).data.desc, '', 'an empty value clears the field');
});

test('changing your password', async () => {
  const change = (currentPassword, newPassword, cookie = user.cookie) =>
    call('POST', '/api/auth/change-password', { cookie, body: { currentPassword, newPassword } });

  assert.equal((await change('secret123', 'newsecret456', null)).status, 401);
  assert.equal((await change('wrong', 'newsecret456')).status, 400);
  assert.equal((await change('secret123', 'short')).status, 400);
  assert.equal((await change('secret123', 'newsecret456')).status, 200);

  assert.equal((await login('maya', 'secret123')).status, 400);
  assert.equal((await login('maya', 'newsecret456')).status, 200);
});

test('resetting a forgotten password', async () => {
  const forgot = (email) => call('POST', '/api/auth/forgot-password', { body: { email } });
  const reset = (token, password) =>
    call('POST', '/api/auth/reset-password', { body: { token, password } });

  // The answer is the same whether or not the address has an account.
  const sentBefore = outbox.length;
  const unknown = await forgot('nobody@example.com');
  assert.equal(unknown.status, 200);
  assert.equal(outbox.length, sentBefore, 'no email for an unknown address');
  const known = await forgot('maya@example.com');
  assert.deepEqual(known.data, unknown.data);
  assert.equal(outbox.length, sentBefore + 1);

  const token = tokenFrom('maya@example.com', '/reset-password');
  assert.equal(JSON.stringify(await stored()).includes(token), false, 'only a hash is stored');

  assert.equal((await reset('y'.repeat(64), 'brandnew789')).status, 400);
  assert.equal((await reset(token, 'short')).status, 400);
  assert.equal((await login('maya', 'newsecret456')).status, 200, 'nothing changed yet');

  assert.equal((await reset(token, 'brandnew789')).status, 200);
  assert.equal((await login('maya', 'newsecret456')).status, 400);
  assert.equal((await login('maya', 'brandnew789')).status, 200);
  assert.equal((await reset(token, 'again12345')).status, 400, 'a link works once');

  // An expired link is refused.
  await forgot('maya@example.com');
  const expired = tokenFrom('maya@example.com', '/reset-password');
  await db
    .collection('users')
    .updateOne({ username: 'maya' }, { $set: { resetExpires: new Date(Date.now() - 1000) } });
  assert.equal((await reset(expired, 'toolate1234')).status, 400);
  assert.equal((await login('maya', 'brandnew789')).status, 200);
});

test('requests that send email are limited', async () => {
  // The five allowed per hour were used above: two confirmation emails and three resets.
  const blocked = await call('POST', '/api/auth/forgot-password', {
    body: { email: 'nobody@example.com' },
  });
  assert.equal(blocked.status, 429);
  assert.match(blocked.data.message, /Too many email requests/);

  const resend = await call('POST', '/api/auth/resend-verification', { cookie: user.cookie });
  assert.equal(resend.status, 429, 'the limit covers every request that sends email');
});
