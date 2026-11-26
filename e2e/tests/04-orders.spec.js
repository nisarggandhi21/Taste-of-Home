import { expect, test } from '@playwright/test';
import { BUYER, CONTROL, SELLER, apiFromPage, login } from './helpers.js';

const row = (page, text) => page.locator('tbody tr', { hasText: text });

test('checkout collects delivery details and the order appears once paid', async ({
  page,
  context,
  request,
}) => {
  // The card form itself is Stripe's; these tests stop at the point where it would load.
  await context.route('https://js.stripe.com/**', (route) => route.abort());
  await login(page, BUYER);
  const items = await apiFromPage(page, 'GET', '/items');
  const item = items.find((entry) => entry.title === 'Veg Burger');

  await page.goto(`/pay/${item._id}`);
  await page.click('button[aria-label="Increase quantity"]');
  await expect(page.locator('.summary .total')).toContainText('240');
  await page.fill('#name', 'Stefan Buyer');
  await page.fill('#phone', '+91 98765 43210');
  await page.fill('#line1', '12 Marine Drive, Flat 4B');
  await page.fill('#city', 'Mumbai');
  await page.fill('#pincode', '400002');
  await page.fill('#notes', 'Ring the bell twice');

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/orders/create-payment-intent/')),
    page.click('button.primary'),
  ]);
  const { clientSecret, total } = await response.json();
  expect(total).toBe(240);
  await expect(page.locator('.deliverTo')).toContainText('12 Marine Drive');
  const intentId = clientSecret.split('_secret')[0];

  // Not paid yet: the page must not claim success, and no order is listed.
  await page.goto(`/success?payment_intent=${intentId}`);
  await expect(page.locator('.success h1')).toContainText('confirm your payment', {
    timeout: 8000,
  });

  // Stripe reports the payment as succeeded.
  await request.post(`${CONTROL}/payment-intents/${intentId}/succeed`);
  await page.goto(`/success?payment_intent=${intentId}`);
  await expect(page.locator('.success h1')).toHaveText('Payment Successful!');
  await expect(page).toHaveURL('/orders', { timeout: 9000 });

  const order = row(page, 'Veg Burger');
  await expect(order.locator('.status')).toHaveText('Placed');
  await expect(order).toContainText('× 2');
  await expect(order).toContainText('₹ 240');
  await expect(order.locator('.address')).toContainText('12 Marine Drive, Flat 4B, Mumbai 400002');
  await expect(order.locator('.cancel-btn')).toBeVisible();
});

test('the seller takes an order through every stage', async ({ page }) => {
  await login(page, SELLER);
  await page.goto('/orders');

  const order = row(page, 'Veg Burger');
  await expect(order.locator('.address')).toContainText('Ring the bell twice');

  const steps = [
    ['Accept order', 'Accepted'],
    ['Start preparing', 'Preparing'],
    ['Out for delivery', 'Out for delivery'],
    ['Mark delivered', 'Delivered'],
  ];
  for (const [button, status] of steps) {
    await order.locator('.advance-btn', { hasText: button }).click();
    await expect(order.locator('.status')).toHaveText(status);
  }

  // A delivered order offers nothing more to do.
  await expect(order.locator('.advance-btn')).toHaveCount(0);
  await expect(order.locator('.cancel-btn')).toHaveCount(0);
});

test('a buyer cancels an order before it is accepted and is refunded', async ({ page }) => {
  await login(page, BUYER);
  await page.goto('/orders');

  const placed = page.locator('tbody tr', { has: page.locator('.status.placed') });
  await expect(placed).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept());
  await placed.locator('.cancel-btn').click();

  const cancelled = page.locator('tbody tr', { has: page.locator('.status.cancelled') });
  await expect(cancelled).toHaveCount(1);
  await expect(cancelled.locator('.note')).toContainText('Refunded');
  await expect(cancelled.locator('.cancel-btn')).toHaveCount(0);
});
