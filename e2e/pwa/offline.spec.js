import { expect, test } from '@playwright/test';
import { BUYER, PASSWORD } from '../tests/helpers.js';

// Resolves once the service worker has taken control of the page.
const appInstalled = (page) =>
  page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })
      );
    }
  });
// Addresses of everything saved from the API on this device.
const savedFromApi = (page) =>
  page.evaluate(async () => {
    const cache = await caches.open('api-public');
    return (await cache.keys()).map((request) => request.url);
  });
const openDish = async (page, title) => {
  await page.locator('.itemCard', { hasText: title }).first().click();
  await expect(page.locator('.item h1')).toHaveText(title);
};

test('the site can be installed as an app', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('head link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href)).json();

  expect(manifest).toMatchObject({
    name: 'Taste of Home',
    display: 'standalone',
    start_url: '/',
    theme_color: '#c9410d',
  });
  // Browsers ask for a 192 and a 512 pixel icon, and Android for one it may crop.
  expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose || 'any'}`)).toEqual([
    '192x192 any',
    '512x512 any',
    '512x512 maskable',
  ]);
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
  }
  expect((await request.get('/icons/apple-touch-icon.png')).status()).toBe(200);
  await appInstalled(page);
});

test('dishes that were opened before can be looked at offline', async ({ page, context }) => {
  await page.goto('/items');
  await appInstalled(page);
  // From here on the service worker sees every request and keeps the public ones.
  await page.reload();
  await expect(page.locator('.items .count')).toHaveText('15 items');
  await openDish(page, 'Chicken Biryani');
  await expect(page.locator('.reviews .review').first()).toBeVisible();
  const dishPath = new URL(page.url()).pathname;
  await expect(page.locator('.offlineBanner')).toHaveCount(0);

  await context.setOffline(true);

  // Opening the site cold, without a connection, on the page that was open.
  await page.reload();
  await expect(page.locator('.offlineBanner')).toContainText('You are offline');
  await expect(page.locator('.item h1')).toHaveText('Chicken Biryani');
  await expect(page.locator('.item .price h2')).toContainText('300');
  await expect(page.locator('.reviews .review').first()).toBeVisible();

  // The list is there too.
  await page.goto('/items');
  await expect(page.locator('.items .count')).toHaveText('15 items');
  await expect(page.locator('.itemCard').first()).toBeVisible();

  // A dish never opened before is not, and the page says so instead of failing oddly.
  await page.locator('.itemCard', { hasText: 'Veg Burger' }).first().click();
  await expect(page.locator('.loadError')).toContainText('not saved on your device yet');

  // What needs a connection says so.
  await page.goto('/login');
  await page.fill('input[name=username]', BUYER);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page.locator('.Toastify')).toContainText(
    'You are offline. This needs a connection.'
  );

  await context.setOffline(false);
  await page.goto(dishPath);
  await expect(page.locator('.offlineBanner')).toHaveCount(0);
  await expect(page.locator('.item h1')).toHaveText('Chicken Biryani');
});

test('nothing personal is kept on the device', async ({ page }) => {
  await page.goto('/login');
  await appInstalled(page);
  await page.reload();
  await page.fill('input[name=username]', BUYER);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page.locator('.navbar .user span')).toHaveText(BUYER);

  // Visit the private pages, then a public one.
  for (const path of ['/orders', '/messages', '/profile', '/favourites']) {
    await page.goto(path);
    await expect(page.locator('.navbar .user span')).toHaveText(BUYER);
    await page.waitForLoadState('networkidle');
  }
  await page.goto('/items');
  await expect(page.locator('.items .count')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const saved = await savedFromApi(page);
  expect(saved.some((url) => url.includes('/api/items'))).toBe(true);
  expect(
    saved.filter((url) => /orders|messages|conversations|users\/me|auth|admin|userId=/.test(url))
  ).toEqual([]);

  // Logging out forgets even that, since lists differ slightly from person to person. (The
  // home page then saves its own, anonymous, lists again, so only this one is looked for.)
  const listSeenLoggedIn = saved.find(
    (url) => url.includes('/api/items?') && url.includes('page=1')
  );
  expect(listSeenLoggedIn).toBeTruthy();
  await page.click('.navbar .user');
  await page.locator('.navbar .options').getByText('Logout').click();
  await expect(page.locator('.navbar .user')).toHaveCount(0);
  await expect.poll(() => savedFromApi(page)).not.toContain(listSeenLoggedIn);
});
