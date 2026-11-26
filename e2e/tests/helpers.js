import { expect } from '@playwright/test';

export const API = 'http://localhost:8800/api';
export const CONTROL = 'http://localhost:8801';
export const PASSWORD = 'secret123';

// Seeded by api/test/support/e2e-server.js
export const SELLER = 'albert';
export const BUYER = 'stefan';

// Image uploads go straight from the browser to Cloudinary. Tests must never reach the real
// account, so the request is answered locally. Returns the list of intercepted uploads.
export const mockUploads = async (context) => {
  const uploads = [];
  await context.route('https://api.cloudinary.com/**', (route) => {
    uploads.push(route.request().url());
    return route.fulfill({
      json: {
        url: 'http://example.com/insecure.png',
        secure_url: 'https://example.com/uploaded.png',
      },
    });
  });
  return uploads;
};

export const login = async (page, username, password = PASSWORD) => {
  await page.goto('/login');
  await page.fill('input[name=username]', username);
  await page.fill('input[name=password]', password);
  await page.click('button[type=submit]');
  await expect(page.locator('.navbar .user span')).toHaveText(username);
};

// Opens a second, separately logged-in browser window.
export const loginInNewContext = async (browser, username, setup) => {
  const context = await browser.newContext();
  if (setup) await setup(context);
  const page = await context.newPage();
  await login(page, username);
  return { context, page };
};

// Calls the API from inside the page, so the request carries the page's login cookie.
export const apiFromPage = (page, method, path) =>
  page.evaluate(
    async ([m, url]) => (await fetch(url, { method: m, credentials: 'include' })).json(),
    [method, `${API}${path}`]
  );
