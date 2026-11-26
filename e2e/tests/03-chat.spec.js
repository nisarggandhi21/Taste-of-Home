import { expect, test } from '@playwright/test';
import { BUYER, SELLER, login, loginInNewContext } from './helpers.js';

const openConversation = async (buyerPage, sellerPage) => {
  await buyerPage.goto('/messages');
  const path = await buyerPage.locator('tbody a.link').first().getAttribute('href');
  await sellerPage.goto(path);
  await buyerPage.goto(path);
  await expect(sellerPage.locator('.messages .item').first()).toBeVisible();
  await expect(buyerPage.locator('.messages .item').first()).toBeVisible();
};

const send = async (page, text) => {
  await page.fill('.write textarea', text);
  await page.click('.write button');
};

test('a message reaches the other person live', async ({ page, browser }) => {
  await login(page, BUYER);
  const seller = await loginInNewContext(browser, SELLER);
  await openConversation(page, seller.page);

  const text = `live message ${Date.now()}`;
  await send(page, text);

  // Well under the 5 second polling fallback, so this can only have arrived over the socket.
  await expect(seller.page.locator('.messages .item p', { hasText: text })).toHaveCount(1, {
    timeout: 2500,
  });
  await seller.context.close();
});

test('chat still updates when live connections are unavailable', async ({ page, browser }) => {
  // This is the situation on serverless hosting such as Vercel.
  const blockSockets = (context) => context.route('**/socket.io/**', (route) => route.abort());
  await blockSockets(page.context());
  await login(page, BUYER);
  const seller = await loginInNewContext(browser, SELLER, blockSockets);
  await openConversation(page, seller.page);

  const text = `polled message ${Date.now()}`;
  await send(page, text);

  await expect(seller.page.locator('.messages .item p', { hasText: text })).toHaveCount(1, {
    timeout: 9000,
  });
  await seller.context.close();
});
