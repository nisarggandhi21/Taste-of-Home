import { expect, test } from '@playwright/test';
import { BUYER, PASSWORD, SELLER, login } from './helpers.js';

// The page itself must never scroll sideways; wide tables scroll inside their own box.
const expectNoSidewaysScroll = async (page, path) => {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, `${path} is ${overflow}px wider than the screen`).toBeLessThanOrEqual(1);
};

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('public pages fit the screen', async ({ page }) => {
    for (const path of ['/', '/items', '/items?cat=north', '/login', '/register', '/no-such-page']) {
      await expectNoSidewaysScroll(page, path);
    }
    await page.goto('/items?search=Paneer');
    await page.locator('.itemCard').first().click();
    await expect(page.locator('.item h1')).toBeVisible();
    await expectNoSidewaysScroll(page, page.url().replace('http://localhost:5173', ''));
  });

  test('buyer pages fit the screen', async ({ page }) => {
    await login(page, BUYER);
    for (const path of ['/orders', '/messages', '/favourites']) {
      await expectNoSidewaysScroll(page, path);
    }
    await page.goto('/items?search=Laddu Box 1');
    const href = await page.locator('.cards a').first().getAttribute('href');
    await expectNoSidewaysScroll(page, href.replace('/item/', '/pay/'));
  });

  test('seller pages fit the screen', async ({ page }) => {
    await login(page, SELLER);
    for (const path of ['/myitems', '/add', '/orders']) {
      await expectNoSidewaysScroll(page, path);
    }
  });
});

test('pages that need a login send visitors to the login page and back', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL('/login');

  await page.fill('input[name=username]', BUYER);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/orders');
  await expect(page.locator('h1', { hasText: 'Orders' })).toBeVisible();
});

test('seller pages are closed to buyers', async ({ page }) => {
  await login(page, BUYER);
  for (const path of ['/add', '/myitems']) {
    await page.goto(path);
    await expect(page).toHaveURL('/');
  }
});

test('an unknown address shows a not-found page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.locator('.notFound h1')).toHaveText('404');
  await page.click('.notFound a[href="/items"]');
  await expect(page).toHaveURL('/items');
});
