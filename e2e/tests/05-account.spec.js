import { expect, test } from '@playwright/test';
import { BUYER, PASSWORD, login } from './helpers.js';

test('registering works without a profile picture', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[name=username]', 'nopicture');
  await page.fill('input[name=email]', 'nopicture@example.com');
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');

  await expect(page).toHaveURL('/');
  await expect(page.locator('.navbar .user span')).toHaveText('nopicture');
});

test('an expired session sends the user back to login', async ({ page, context }) => {
  await login(page, BUYER);
  await context.clearCookies();

  await page.goto('/orders');
  await expect(page).toHaveURL('/login', { timeout: 8000 });
  await expect(page.locator('.navbar a[href="/login"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('currentUser'))).toBe('null');
});
