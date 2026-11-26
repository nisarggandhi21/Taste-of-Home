import { expect, test } from '@playwright/test';
import { SELLER, login } from './helpers.js';

// These tests run against a local stand-in for the AI model (api/test/support/fake-genai.js):
// they check the site's side of each feature, not the quality of a real model's answers.

const assistant = (page) => page.getByRole('dialog', { name: 'Food assistant' });

test('the assistant suggests real dishes and links to them', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open food assistant' }).click();
  await expect(assistant(page)).toBeVisible();
  await expect(assistant(page).locator('.suggestions button')).toHaveCount(3);

  await assistant(page).getByLabel('Ask the food assistant').fill('Paneer');
  await assistant(page).getByRole('button', { name: 'Send' }).click();

  await expect(assistant(page).locator('.chatMessage.from-user p')).toHaveText('Paneer');
  await expect(assistant(page).locator('.chatMessage.from-assistant p').last()).toContainText('Paneer Thali (₹ 250)');
  const dish = assistant(page).locator('.dish', { hasText: 'Paneer Thali' });
  await expect(dish).toContainText('₹ 250');

  // The card opens the dish, and the panel gets out of the way.
  await dish.click();
  await expect(page).toHaveURL(/\/item\//);
  await expect(page.locator('.item h1')).toHaveText('Paneer Thali');
  await expect(assistant(page)).toBeHidden();
});

test('the assistant says so when nothing matches', async ({ page }) => {
  await page.goto('/items');
  await page.getByRole('button', { name: 'Open food assistant' }).click();
  await assistant(page).getByLabel('Ask the food assistant').fill('zzzzqqqq');
  await assistant(page).getByLabel('Ask the food assistant').press('Enter');
  await expect(assistant(page).locator('.chatMessage.from-assistant p').last()).toContainText('could not find anything');
  await expect(assistant(page).locator('.dish')).toHaveCount(0);
});

test('a seller fills in a listing from the photo and saves it', async ({ page, context }) => {
  const photo = 'https://res.cloudinary.com/demo/image/upload/dosa.png';
  await context.route('https://api.cloudinary.com/**', (route) =>
    route.fulfill({ json: { secure_url: photo } })
  );
  // The preview image itself is not needed for the test.
  await context.route('https://res.cloudinary.com/**', (route) => route.abort());
  await login(page, SELLER);

  await page.goto('/add');
  await expect(page.locator('.aiDraft')).toHaveCount(0); // nothing to draft from yet
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'dosa.png', mimeType: 'image/png', buffer: Buffer.from('x') });
  await page.click('.images button');

  await page.getByRole('button', { name: 'Fill in from photo' }).click();
  await expect(page.locator('.aiDraft span')).toContainText('Check every field before saving');

  // The draft landed in the form, where the seller can still change it.
  await expect(page.locator('input[name=title]')).toHaveValue('Masala Dosa');
  await expect(page.locator('select[name=cat]')).toHaveValue('south');
  await expect(page.locator('select[name=diet]')).toHaveValue('veg');
  await expect(page.getByLabel('Dairy')).toBeChecked();
  await expect(page.locator('textarea[name=desc]')).toHaveValue(/crisp, golden dosa/);
  await expect(page.locator('.addedFeatures .item')).toHaveCount(2);

  await page.getByLabel('Dairy').uncheck();
  await page.fill('input[name=deliveryTime]', '1');
  await page.fill('input[name=price]', '110');
  await page.click('.info > button');
  await expect(page).toHaveURL('/myitems');
  await expect(page.locator('tbody tr', { hasText: 'Masala Dosa' })).toContainText('₹ 110');
});

test('search results say when they were matched by meaning', async ({ page }) => {
  await page.goto('/items?search=Paneer');
  await expect(page.locator('.smart')).toHaveText('Smart search');
  await expect(page.locator('#sort')).toHaveValue('relevance');
  await expect(page.locator('.itemCard').first()).toContainText('Paneer Thali');

  // Browsing without a search has no such note and no "best match" order.
  await page.goto('/items');
  await expect(page.locator('.itemCard').first()).toBeVisible();
  await expect(page.locator('.smart')).toHaveCount(0);
  await expect(page.locator('#sort option[value="relevance"]')).toHaveCount(0);
});

test('a dish with enough reviews shows what buyers say', async ({ page }) => {
  await page.goto('/items?search=Chicken Biryani');
  await page.locator('.itemCard', { hasText: 'Chicken Biryani' }).click();

  const summary = page.locator('.reviewSummary');
  await expect(summary.locator('h3')).toHaveText('What buyers say');
  await expect(summary).toContainText('would order it again');
  await expect(summary.locator('.point.pro')).toHaveCount(2);
  await expect(summary.locator('.point.con')).toHaveText('− Arrived a little late');
  await expect(summary.locator('.source')).toContainText('from 3 reviews');

  // A dish with too few reviews has no summary.
  await page.goto('/items?search=Veg Burger');
  await page.locator('.itemCard', { hasText: 'Veg Burger' }).click();
  await expect(page.locator('.reviews h2')).toBeVisible();
  await expect(page.locator('.reviewSummary')).toHaveCount(0);
});

test('without AI on the server, none of it is shown', async ({ page, context }) => {
  await context.route('**/api/ai/status', (route) => route.fulfill({ json: { enabled: false } }));
  await page.goto('/');
  await expect(page.locator('.featured input')).toHaveAttribute('placeholder', 'Try "cake"');
  await expect(page.getByRole('button', { name: 'Open food assistant' })).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the assistant fits the screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open food assistant' }).click();
    const box = await assistant(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
