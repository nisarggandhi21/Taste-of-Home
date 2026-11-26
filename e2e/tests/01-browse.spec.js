import { expect, test } from '@playwright/test';
import { BUYER, login } from './helpers.js';

test('category cards link to real categories', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page
    .locator('.slide a[href^="/items?cat="]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

  expect(hrefs).toContain('/items?cat=icecream');
  expect(hrefs).toContain('/items?cat=chocolates');
  expect(hrefs.join(' ')).not.toMatch(/ice%20cream|ice cream|choclates/);

  const shortcuts = await page.locator('.popular button').allTextContents();
  expect(shortcuts).not.toContain('Dessert');
});

test('a category page lists only that category', async ({ page }) => {
  await page.goto('/items?cat=burger');
  await expect(page.locator('.itemCard')).toHaveCount(1);
});

test('each item page shows its own item straight away', async ({ page }) => {
  await login(page, BUYER);
  await page.goto('/items');
  await expect(page.locator('.itemCard').first()).toBeVisible();
  const links = await page
    .locator('.cards a')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
  expect(links.length).toBeGreaterThanOrEqual(2);

  // Client-side navigation keeps the query cache, which is where stale data used to leak from.
  const titles = [];
  for (const href of links.slice(0, 2)) {
    await page.goto('/items');
    await page.click(`.cards a[href="${href}"]`);
    await expect(page.locator('.item h1')).toBeVisible();
    titles.push(await page.locator('.item h1').textContent());
  }
  expect(new Set(titles).size).toBe(2);
});

test('items can be filtered by city, diet and allergens, and paged', async ({ page }) => {
  await page.goto('/items');
  await expect(page.locator('.itemCard')).toHaveCount(12);

  // Everything from the cook in Pune: 13 items, so two pages.
  await page.fill('#location', 'Pune');
  await page.click('.filters button[type=submit]');
  await expect(page.locator('.count')).toHaveText('13 items');
  await expect(page.locator('.itemCard')).toHaveCount(12);
  await expect(page.locator('.pager span')).toHaveText('Page 1 of 2');
  await page.click('.pager button:has-text("Next")');
  await expect(page.locator('.itemCard')).toHaveCount(1);
  await expect(page.locator('.pager span')).toHaveText('Page 2 of 2');

  // Choosing a filter goes back to the first page.
  await page.getByLabel('Nuts').check();
  await expect(page.locator('.count')).toHaveText('12 items');
  await expect(page.locator('.hint')).toContainText('declared their allergens');

  await page.getByLabel('Nuts').uncheck();
  await page.selectOption('#diet', 'nonveg');
  await expect(page.locator('.count')).toHaveText('1 item');
  await expect(page.locator('.itemCard')).toContainText('Chicken Biryani');
  await expect(page.locator('.itemCard .dietBadge.nonveg')).toBeVisible();

  await page.click('.clear');
  await expect(page.locator('.itemCard')).toHaveCount(12);
  await expect(page.locator('#location')).toHaveValue('');
});

test('items can be sorted by price', async ({ page }) => {
  await page.goto('/items?cat=north');
  await page.selectOption('#sort', 'price');
  await expect(page.locator('.itemCard').first()).toContainText('Chicken Biryani');
  await page.selectOption('#sort', 'priceAsc');
  await expect(page.locator('.itemCard').first()).toContainText('Paneer Thali');
});
