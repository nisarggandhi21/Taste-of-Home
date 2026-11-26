import { expect, test } from '@playwright/test';

const PAGES = {
  '/about': 'About Taste of Home',
  '/contact': 'Contact',
  '/help': 'Help & FAQ',
  '/buying': 'Buying on Taste of Home',
  '/selling': 'Selling on Taste of Home',
  '/safety': 'Trust & Safety',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
  '/standards': 'Community Standards',
};

test('every footer entry is a link to a real page', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('.footer .top');

  // Nothing in the footer is plain text pretending to be a link any more.
  const loose = await footer.locator('.item > span').count();
  expect(loose).toBe(0);

  for (const [path, title] of Object.entries(PAGES)) {
    await expect(footer.locator(`a[href="${path}"]`)).toHaveText(title);
  }
});

test('footer pages open at the top and link to each other', async ({ page }) => {
  await page.goto('/');
  await page.locator('.footer a[href="/privacy"]').click();
  await expect(page).toHaveURL('/privacy');
  await expect(page.locator('.infoPage h1')).toHaveText('Privacy Policy');
  await expect(page).toHaveTitle('Privacy Policy | Taste of Home');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.locator('.sideNav a[href="/terms"]').click();
  await expect(page.locator('.infoPage h1')).toHaveText('Terms of Service');
  await expect(page.locator('.sideNav a.current')).toHaveText('Terms of Service');

  for (const [path, title] of Object.entries(PAGES)) {
    await page.goto(path);
    await expect(page.locator('.infoPage h1')).toHaveText(title);
    expect(await page.locator('.infoPage article section').count()).toBeGreaterThan(1);
  }
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a footer page fits the screen', async ({ page }) => {
    await page.goto('/help');
    await expect(page.locator('.infoPage h1')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
