import { expect, test } from '@playwright/test';
import { BUYER, CONTROL, SELLER, apiFromPage, login } from './helpers.js';

test('the success page shows the real payment result', async ({ page, request }) => {
  await login(page, BUYER);
  const items = await apiFromPage(page, 'GET', '/items');
  const { clientSecret } = await apiFromPage(
    page,
    'POST',
    `/orders/create-payment-intent/${items[0]._id}`
  );
  const intentId = clientSecret.split('_secret')[0];

  // Not paid yet: the page must not claim success.
  await page.goto(`/success?payment_intent=${intentId}`);
  await expect(page.locator('.success h1')).toContainText('confirm your payment', {
    timeout: 8000,
  });

  // Stripe reports the payment as succeeded.
  await request.post(`${CONTROL}/payment-intents/${intentId}/succeed`);
  await page.goto(`/success?payment_intent=${intentId}`);
  await expect(page.locator('.success h1')).toHaveText('Payment Successful!');
  await expect(page).toHaveURL('/orders', { timeout: 9000 });
});

test('a seller sees paid orders and marks one completed', async ({ page }) => {
  await login(page, SELLER);
  await page.goto('/orders');
  await expect(page.locator('tbody tr').first()).toBeVisible();

  const rows = await page.locator('tbody tr').evaluateAll((trs) =>
    trs.map((tr) => ({
      status: tr.querySelector('.status').textContent,
      canComplete: !!tr.querySelector('.complete-btn'),
    }))
  );
  // Paid orders wait for the seller; completed ones offer nothing more to do.
  expect(rows.some((row) => row.status === 'Pending' && row.canComplete)).toBe(true);
  expect(rows.some((row) => row.status === 'Completed')).toBe(true);
  for (const row of rows) expect(row.canComplete).toBe(row.status !== 'Completed');

  const pending = await page.locator('.complete-btn').count();
  await page.locator('.complete-btn').first().click();
  await expect(page.locator('.complete-btn')).toHaveCount(pending - 1);
});
