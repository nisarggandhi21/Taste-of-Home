import { expect, test } from '@playwright/test';
import { API, BUYER, CONTROL, PASSWORD, login, loginInNewContext } from './helpers.js';

const ADMIN = 'root';
const COOK = 'dodgy-cook';
const DISH = 'Mystery Meat Curry';

const address = {
  name: 'Stefan Buyer',
  phone: '+91 98765 43210',
  line1: '12 Marine Drive',
  city: 'Mumbai',
  pincode: '400002',
};

// Talks to the API directly, as the given user.
const apiAs = async (request, username) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { username, password: PASSWORD },
  });
  const cookie = res.headers()['set-cookie'].split(';')[0];
  return async (method, path, data) => {
    const res = await request[method](`${API}${path}`, { headers: { cookie }, data });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };
};

const openTab = async (page, name) => {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
};
const search = async (page, text) => {
  await page.getByRole('searchbox').fill(text);
  await page.getByRole('button', { name: 'Search' }).click();
};
const giveReason = async (page, reason, confirm) => {
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: confirm })).toBeDisabled();
  await dialog.getByLabel('Reason').fill(reason);
  await dialog.getByRole('button', { name: confirm }).click();
  await expect(dialog).toBeHidden();
};

let orderRef;

// A cook with one dish, and a paid order for it, made just for these tests.
test.beforeAll(async ({ request }) => {
  const registered = await request.post(`${API}/auth/register`, {
    data: {
      username: COOK,
      email: `${COOK}@example.com`,
      password: PASSWORD,
      isSeller: true,
      location: 'Delhi',
    },
  });
  expect(registered.status()).toBe(201);
  const cook = await apiAs(request, COOK);
  const dish = await cook('post', '/items', {
    title: DISH,
    cat: 'north',
    cover: 'https://example.com/cover.png',
    images: [],
    desc: 'A long enough description',
    shortTitle: 'Curry',
    shortDesc: 'Hard to say what is in it',
    deliveryTime: 2,
    features: ['fresh'],
    price: 180,
    diet: 'nonveg',
    allergens: [],
  });

  const buyer = await apiAs(request, BUYER);
  const checkout = await buyer('post', '/orders/checkout', {
    items: [{ itemId: dish._id, quantity: 2 }],
    deliveryAddress: address,
  });
  const intent = checkout.clientSecret.split('_secret')[0];
  await request.post(`${CONTROL}/payment-intents/${intent}/succeed`);
  await buyer('put', '/orders', { payment_intent: intent });
  const orders = await buyer('get', '/orders');
  const placed = orders.find((order) => order.title === DISH);
  orderRef = `#${placed._id.slice(-6).toUpperCase()}`;
});

test('the admin pages are for administrators only', async ({ page }) => {
  await login(page, BUYER);
  await page.click('.navbar .user');
  await expect(page.locator('.navbar .options')).toBeVisible();
  await expect(page.locator('.navbar .options').getByText('Admin')).toHaveCount(0);

  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  const refused = await page.evaluate(
    async (url) => (await fetch(url, { credentials: 'include' })).status,
    `${API}/admin/users`
  );
  expect(refused).toBe(404);
});

test('an administrator takes a listing down and restores it', async ({ page, browser }) => {
  const cook = await loginInNewContext(browser, COOK);

  await login(page, ADMIN);
  await page.click('.navbar .user');
  await page.locator('.navbar .options').getByText('Admin').click();
  await expect(page.locator('.admin h1')).toHaveText('Admin');
  await expect(page.locator('.admin .tile').first()).toContainText('Users');

  await openTab(page, 'Listings');
  await search(page, 'mystery');
  const row = page.locator('.admin tbody tr', { hasText: DISH });
  await expect(row).toContainText(COOK);
  await expect(row).toContainText('On sale');

  await row.getByRole('button', { name: 'Take down' }).click();
  await giveReason(page, 'Photo is not of the dish', 'Take down listing');
  await expect(row).toContainText('Taken down');
  await expect(row).toContainText('Photo is not of the dish');

  // Buyers no longer find it; the cook sees why and cannot switch it back on.
  await cook.page.goto(`/items?search=${encodeURIComponent(DISH)}`);
  await expect(cook.page.locator('.items .count')).toHaveText('0 items');
  await cook.page.goto('/myitems');
  const own = cook.page.locator('.myitems tbody tr', { hasText: DISH });
  await expect(own).toContainText('Taken down');
  await expect(own).toContainText('By Taste of Home: Photo is not of the dish');
  await expect(own.locator('.toggle')).toBeDisabled();

  await row.getByRole('button', { name: 'Restore' }).click();
  await expect(row).toContainText('On sale');
  await cook.page.reload();
  await expect(own).toContainText('Available');
  await cook.context.close();
});

test('an administrator refunds an order and suspends an account', async ({ page, browser }) => {
  const cook = await loginInNewContext(browser, COOK);
  await login(page, ADMIN);
  await page.goto('/admin?tab=orders');

  await search(page, orderRef);
  const order = page.locator('.admin tbody tr', { hasText: orderRef });
  await expect(order).toContainText(`2 × ${DISH}`);
  await expect(order).toContainText('₹ 360');
  await order.getByRole('button', { name: 'Refund' }).click();
  await expect(page.getByRole('dialog')).toContainText('stefan gets ₹ 360 back in full');
  await giveReason(page, 'Buyer reported it arrived spoiled', 'Refund ₹ 360');
  await expect(order).toContainText('cancelled');
  await expect(order).toContainText('Refunded');

  const mails = await (await page.request.get(`${CONTROL}/emails?to=stefan@example.com`)).json();
  expect(mails.at(-1).subject).toBe(`Order ${orderRef} cancelled and refunded`);
  expect(mails.at(-1).text).toContain('Buyer reported it arrived spoiled');

  await openTab(page, 'Users');
  await search(page, COOK);
  const user = page.locator('.admin tbody tr', { hasText: COOK });
  await user.getByRole('button', { name: 'Suspend' }).click();
  await giveReason(page, 'Sold food that was not homemade', 'Suspend account');
  await expect(user).toContainText('Suspended');

  // The cook's open session ends, and logging in again is refused with the reason.
  await cook.page.goto('/myitems');
  await expect(cook.page).toHaveURL(/\/login/);
  await cook.page.fill('input[name=username]', COOK);
  await cook.page.fill('input[name=password]', PASSWORD);
  await cook.page.click('button[type=submit]');
  await expect(cook.page.locator('.Toastify')).toContainText(
    'suspended. Contact us if you think this is a mistake. Reason given: Sold food that was not homemade'
  );
  await expect(cook.page.locator('.navbar .user')).toHaveCount(0);

  await user.getByRole('button', { name: 'Lift suspension' }).click();
  await expect(user).toContainText('Active');

  await openTab(page, 'Activity');
  const log = page.locator('.admin .actionList li');
  await expect(log.nth(0)).toContainText(`root lifted the suspension of ${COOK}`);
  await expect(log.nth(1)).toContainText(
    `root suspended ${COOK} — Sold food that was not homemade`
  );
  await expect(log.nth(2)).toContainText(`root refunded ${orderRef} ${DISH}`);
  await cook.context.close();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the admin pages fit the screen', async ({ page }) => {
    await login(page, ADMIN);
    for (const tab of ['', '?tab=users', '?tab=listings', '?tab=orders', '?tab=activity']) {
      await page.goto(`/admin${tab}`);
      await expect(page.locator('.admin .panel')).not.toContainText('Loading');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `/admin${tab}`).toBeLessThanOrEqual(1);
    }
  });
});
