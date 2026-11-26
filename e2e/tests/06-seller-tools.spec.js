import { expect, test } from '@playwright/test';
import { BUYER, SELLER, login, loginInNewContext, mockUploads } from './helpers.js';

const myItem = (page, title) => page.locator('tbody tr', { hasText: title });

test('a seller sees earnings and edits an item', async ({ page, context }) => {
  await mockUploads(context);
  await login(page, SELLER);
  await page.goto('/myitems');

  // Earnings come from the orders delivered earlier in this run and in the seed data.
  await expect(page.locator('.summary .stat').first()).toContainText('Earned');
  await expect(page.locator('.summary .stat').first()).toContainText('delivered');

  await myItem(page, 'Veg Burger').locator('.edit').click();
  await expect(page.locator('h1', { hasText: 'Edit Item' })).toBeVisible();
  // The form opens filled in with the current values.
  await expect(page.locator('input[name=title]')).toHaveValue('Veg Burger');
  await expect(page.locator('input[name=price]')).toHaveValue('120');
  await expect(page.locator('select[name=diet]')).toHaveValue('veg');
  await expect(page.getByLabel('Gluten')).toBeChecked();

  await page.fill('input[name=price]', '135');
  await page.getByLabel('Sesame').check();
  await page.click('.info > button');

  await expect(page).toHaveURL('/myitems');
  await expect(myItem(page, 'Veg Burger')).toContainText('₹ 135');
});

test('a paused item disappears from browsing until resumed', async ({ page, browser }) => {
  await login(page, SELLER);
  await page.goto('/myitems');
  const row = myItem(page, 'Veg Burger');

  await row.locator('.toggle', { hasText: 'Pause' }).click();
  await expect(row.locator('.state')).toHaveText('Paused');

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto('/items?cat=burger');
  await expect(visitorPage.locator('.empty')).toBeVisible();

  await row.locator('.toggle', { hasText: 'Resume' }).click();
  await expect(row.locator('.state')).toHaveText('Available');
  await visitorPage.reload();
  await expect(visitorPage.locator('.itemCard')).toHaveCount(1);
  await visitor.close();
});

test('saving and removing a favourite', async ({ page, browser }) => {
  // Without a login the heart leads to the login page.
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto('/items?cat=burger');
  await visitorPage.locator('.itemCard .favourite').click();
  await expect(visitorPage).toHaveURL('/login');
  await visitor.close();

  await login(page, BUYER);
  await page.goto('/items?cat=burger');
  const heart = page.locator('.itemCard .favourite');
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL('/items?cat=burger'); // the click did not open the item

  await page.goto('/favourites');
  await expect(page.locator('.itemCard')).toHaveCount(1);
  await expect(page.locator('.itemCard')).toContainText('Veg Burger');

  await page.locator('.itemCard .favourite').click();
  await expect(page.locator('.empty')).toContainText('Nothing saved yet');
});

test('the item page shows real seller figures and Contact Me opens the chat', async ({ page }) => {
  await login(page, BUYER);
  await page.goto('/items?search=Paneer');
  await page.locator('.itemCard').first().click();

  const seller = page.locator('.seller .box');
  await expect(seller).toContainText('Orders delivered');
  await expect(seller).toContainText('Member since');
  await expect(seller).not.toContainText('Avg. response time');
  await expect(seller).not.toContainText('Aug 2022');

  await page.locator('.seller button', { hasText: 'Contact Me' }).click();
  await expect(page).toHaveURL(/\/message\//);
  // It is the conversation these two already had, not a new empty one.
  await expect(page.locator('.messages .item p').first()).toHaveText('Is the thali spicy?');
});

test('a buyer reviews an item and another user marks the review helpful', async ({
  page,
  browser,
}) => {
  await login(page, BUYER);
  await page.goto('/items?search=Paneer');
  await page.locator('.itemCard').first().click();
  const itemUrl = page.url();

  await page.fill('.addForm input', 'Just like home');
  await page.selectOption('.addForm select', '5');
  await page.click('.addForm button');
  const review = page.locator('.review', { hasText: 'Just like home' });
  await expect(review).toBeVisible();
  // You cannot vote on your own review.
  await expect(review.locator('.vote').first()).toBeDisabled();

  const other = await loginInNewContext(browser, 'pune-cook');
  await other.page.goto(itemUrl);
  const yes = other.page.locator('.review', { hasText: 'Just like home' }).locator('.vote').first();
  await expect(yes).toContainText('Yes (0)');
  await yes.click();
  await expect(yes).toContainText('Yes (1)');
  await expect(yes).toHaveAttribute('aria-pressed', 'true');
  // Clicking again takes the vote back.
  await yes.click();
  await expect(yes).toContainText('Yes (0)');
  await other.context.close();
});
