import { expect, test } from '@playwright/test';
import { SELLER, apiFromPage, login, mockUploads } from './helpers.js';

test('a seller adds an item through the form', async ({ page, context }) => {
  await mockUploads(context);
  await login(page, SELLER);

  await page.goto('/add');
  await page.fill('input[name=title]', 'Mango Ice Cream');
  await page.selectOption('select[name=cat]', 'icecream');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('x') });
  await page.click('.images button');
  await expect(page.locator('.images button')).toHaveText('Upload');
  await page.fill('textarea[name=desc]', 'Hand-churned mango ice cream made at home.');
  await page.fill('input[name=shortTitle]', 'Mango Ice Cream');
  await page.fill('textarea[name=shortDesc]', 'Creamy and fresh');
  await page.fill('input[name=deliveryTime]', '2');
  await page.fill('input[name=price]', '180');
  await page.selectOption('select[name=diet]', 'veg');
  await page.getByLabel('Dairy').check();
  await page.click('.info > button');

  await expect(page).toHaveURL('/myitems');
  await expect(page.locator('table td', { hasText: 'Mango Ice Cream' })).toBeVisible();

  // The image is stored with its https address.
  const sellerId = await page.evaluate(() => JSON.parse(localStorage.getItem('currentUser'))._id);
  const { items } = await apiFromPage(page, 'GET', `/items?userId=${sellerId}`);
  const created = items.find((item) => item.title === 'Mango Ice Cream');
  expect(created.cover).toBe('https://example.com/uploaded.png');
  expect(created.price).toBe(180);
  expect(created.diet).toBe('veg');
  expect(created.allergens).toEqual(['dairy']);

  // Buyers find it under its category.
  await context.clearCookies();
  await page.goto('/items?cat=icecream');
  await expect(page.locator('.itemCard')).toHaveCount(1);
});

test('a non-image upload is refused before it leaves the browser', async ({ page, context }) => {
  const uploads = await mockUploads(context);
  await login(page, SELLER);

  await page.goto('/add');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await page.click('.images button');

  await expect(page.locator('.Toastify__toast')).toContainText('Only JPG, PNG or WebP');
  expect(uploads).toHaveLength(0);
});
