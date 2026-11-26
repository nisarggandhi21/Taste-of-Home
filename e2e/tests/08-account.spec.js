import { expect, test } from '@playwright/test';
import { CONTROL, PASSWORD, login, mockUploads } from './helpers.js';

// The link inside the newest email the API "sent" to an address.
const linkFromEmail = async (request, to, path) => {
  const emails = await (await request.get(`${CONTROL}/emails?to=${encodeURIComponent(to)}`)).json();
  const line = emails
    .at(-1)
    .text.split('\n')
    .find((text) => text.includes(path));
  return line.replace('http://localhost:5173', '');
};

const registerUser = async (page, username) => {
  await page.goto('/register');
  await page.fill('input[name=username]', username);
  await page.fill('input[name=email]', `${username}@example.com`);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page.locator('.navbar .user span')).toHaveText(username);
};

test('a new user confirms their email from the link they were sent', async ({ page, request }) => {
  await registerUser(page, 'newcomer');

  await page.goto('/profile');
  await expect(page.locator('.badge')).toHaveText('Not confirmed');
  await expect(page.locator('.notice')).toContainText('confirm your email');

  await page.goto(await linkFromEmail(request, 'newcomer@example.com', '/verify-email'));
  await expect(page.locator('.account .notice')).toHaveText('Your email address is confirmed.');

  await page.click('.account a');
  await expect(page).toHaveURL('/profile');
  await expect(page.locator('.badge')).toHaveText('Confirmed');
  await expect(page.locator('.profile .notice')).toHaveCount(0);

  // The link cannot be used a second time.
  await page.goto(await linkFromEmail(request, 'newcomer@example.com', '/verify-email'));
  await expect(page.locator('.account .notice.problem')).toBeVisible();
});

test('a user edits their profile and changes their password', async ({ page, context }) => {
  await mockUploads(context);
  await login(page, 'newcomer');
  await page.goto('/profile');

  await page.fill('#location', 'Jaipur');
  await page.fill('#desc', 'I love dal baati');
  await page
    .locator('#picture')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: Buffer.from('x') });
  await page.click('button:has-text("Save profile")');
  await expect(page.locator('.Toastify__toast', { hasText: 'Profile saved' })).toBeVisible();

  await page.reload();
  await expect(page.locator('#location')).toHaveValue('Jaipur');
  await expect(page.locator('#desc')).toHaveValue('I love dal baati');
  await expect(page.locator('.header img')).toHaveAttribute('src', 'https://example.com/uploaded.png');
  await expect(page.locator('.navbar .user img')).toHaveAttribute(
    'src',
    'https://example.com/uploaded.png'
  );

  // A wrong current password is refused.
  await page.fill('#current', 'not-my-password');
  await page.fill('#next', 'changed-secret');
  await page.click('button:has-text("Change password")');
  await expect(page.locator('.Toastify__toast', { hasText: 'not correct' })).toBeVisible();

  await page.fill('#current', PASSWORD);
  await page.click('button:has-text("Change password")');
  await expect(page.locator('.Toastify__toast', { hasText: 'has been changed' })).toBeVisible();
});

test('a forgotten password is reset from the emailed link', async ({ page, request }) => {
  await page.goto('/login');
  await page.click('a.forgot');
  await expect(page).toHaveURL('/forgot-password');
  await page.fill('#email', 'newcomer@example.com');
  await page.click('button[type=submit]');
  await expect(page.locator('.account .notice')).toContainText('If an account uses that email');

  await page.goto(await linkFromEmail(request, 'newcomer@example.com', '/reset-password'));
  await page.fill('#password', 'brand-new-secret');
  await page.fill('#repeat', 'something-else');
  await page.click('button[type=submit]');
  await expect(page.locator('.notice.problem')).toHaveText('The two passwords are not the same.');

  await page.fill('#repeat', 'brand-new-secret');
  await page.click('button[type=submit]');
  await expect(page.locator('.account .notice')).toContainText('password has been changed');

  // The new password works; the one set from the profile page no longer does.
  await page.click('.account a');
  await page.fill('input[name=username]', 'newcomer');
  await page.fill('input[name=password]', 'changed-secret');
  await page.click('button[type=submit]');
  await expect(page.locator('.Toastify__toast', { hasText: 'Wrong username or password' })).toBeVisible();

  await page.fill('input[name=password]', 'brand-new-secret');
  await page.click('button[type=submit]');
  await expect(page.locator('.navbar .user span')).toHaveText('newcomer');
});
