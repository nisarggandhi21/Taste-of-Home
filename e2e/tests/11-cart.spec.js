import { expect, test } from '@playwright/test';
import { BUYER, CONTROL, PASSWORD, login } from './helpers.js';

const badge = (page) => page.locator('.navbar .cartLink .badge');

// Opens a dish's page by searching for it and adds it to the cart.
const addToCart = async (page, title, { times = 1 } = {}) => {
  await page.goto(`/items?search=${encodeURIComponent(title)}`);
  await page.locator('.itemCard', { hasText: title }).first().click();
  await expect(page.locator('.item h1')).toHaveText(title);
  for (let i = 1; i < times; i++) await page.click('.buy button[aria-label="Increase quantity"]');
  await page.click('.addToCart');
};

test('a cart holds several dishes, but from one cook at a time', async ({ page }) => {
  // No account is needed to fill a cart.
  await addToCart(page, 'Paneer Thali', { times: 2 });
  await expect(badge(page)).toHaveText('2');
  await expect(page.locator('.viewCart')).toContainText('2 in your cart');

  await addToCart(page, 'Veg Burger');
  await expect(badge(page)).toHaveText('3');

  // A dish from another cook: declining keeps the cart, accepting starts a new one.
  page.once('dialog', (dialog) => dialog.dismiss());
  await addToCart(page, 'Chicken Biryani');
  await expect(badge(page)).toHaveText('3');

  page.once('dialog', (dialog) => dialog.accept());
  await page.click('.addToCart');
  await expect(badge(page)).toHaveText('1');

  // The cart survives a reload.
  await page.reload();
  await expect(badge(page)).toHaveText('1');
  await page.goto('/cart');
  await expect(page.locator('.cart .line')).toHaveCount(1);
  await expect(page.locator('.cart .line')).toContainText('Chicken Biryani');
});

test('checkout asks for a login and keeps the cart', async ({ page }) => {
  await addToCart(page, 'Paneer Thali');
  await page.goto('/cart');
  await page.click('.cart .checkout');
  await expect(page).toHaveURL('/login');

  await page.fill('input[name=username]', BUYER);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/checkout');
  await expect(page.locator('.pay .summaryLine')).toContainText('Paneer Thali');
});

test('a buyer edits the cart, pays, and the order lists every dish', async ({
  page,
  context,
  request,
}) => {
  await context.route('https://js.stripe.com/**', (route) => route.abort());
  await login(page, BUYER);
  await addToCart(page, 'Paneer Thali', { times: 2 });
  await addToCart(page, 'Veg Burger');
  await addToCart(page, 'Mango Ice Cream');

  await page.goto('/cart');
  await expect(page.locator('.cart .from')).toContainText('albert');
  await expect(page.locator('.cart .line')).toHaveCount(3);
  await expect(page.locator('.cart .summary .total')).toContainText('815'); // 500 + 135 + 180

  await page.click('button[aria-label="Increase quantity of Veg Burger"]');
  await page.click('button[aria-label="Remove Mango Ice Cream"]');
  await expect(page.locator('.cart .line')).toHaveCount(2);
  await expect(page.locator('.cart .summary .total')).toContainText('770'); // 500 + 270
  await expect(badge(page)).toHaveText('4');

  await page.click('.cart .checkout');
  await expect(page).toHaveURL('/checkout');
  await expect(page.locator('.pay .summaryLine')).toHaveCount(2);
  await page.fill('#name', 'Stefan Buyer');
  await page.fill('#phone', '+91 98765 43210');
  await page.fill('#line1', '12 Marine Drive, Flat 4B');
  await page.fill('#city', 'Mumbai');
  await page.fill('#pincode', '400002');

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/orders/checkout')),
    page.click('button.primary'),
  ]);
  const { clientSecret, total } = await response.json();
  expect(total).toBe(770);
  const intentId = clientSecret.split('_secret')[0];

  // Until the payment goes through the cart is kept.
  await expect(badge(page)).toHaveText('4');

  await request.post(`${CONTROL}/payment-intents/${intentId}/succeed`);
  await page.goto(`/success?payment_intent=${intentId}`);
  await expect(page.locator('.success h1')).toHaveText('Payment Successful!');
  await expect(badge(page)).toHaveCount(0);
  await expect(page).toHaveURL('/orders', { timeout: 9000 });

  const order = page.locator('tbody tr', { hasText: '₹ 770' });
  await expect(order.locator('.dish')).toHaveText(['Paneer Thali × 2', 'Veg Burger × 2']);
  await expect(order.locator('.status')).toHaveText('Placed');

  await page.goto('/cart');
  await expect(page.locator('.cart .empty')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the cart and checkout fit the screen', async ({ page }) => {
    await login(page, BUYER);
    await addToCart(page, 'Paneer Thali', { times: 2 });
    await addToCart(page, 'Veg Burger');
    for (const path of ['/cart', '/checkout']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} is ${overflow}px wider than the screen`).toBeLessThanOrEqual(1);
    }
  });
});
