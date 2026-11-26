import { expect, test } from '@playwright/test';

const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const background = (page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const option = (page, name) => page.getByRole('radio', { name: `${name} theme` });

test.describe('with the system set to dark', () => {
  test.use({ colorScheme: 'dark' });

  test('the site starts in the dark theme', async ({ page }) => {
    await page.goto('/');
    expect(await theme(page)).toBe('dark');
    await expect(option(page, 'Dark')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('with the system set to light', () => {
  test.use({ colorScheme: 'light' });

  test('the site starts light, and a chosen theme is kept', async ({ page }) => {
    await page.goto('/');
    expect(await theme(page)).toBe('light');
    const light = await background(page);

    await option(page, 'Dark').click();
    expect(await theme(page)).toBe('dark');
    await expect(option(page, 'Dark')).toHaveAttribute('aria-checked', 'true');
    await expect(option(page, 'Light')).toHaveAttribute('aria-checked', 'false');
    await expect.poll(() => background(page)).not.toBe(light);

    await option(page, 'Glass').click();
    expect(await theme(page)).toBe('glass');

    // The choice survives a reload and moving to another page, and wins over the system.
    await page.reload();
    expect(await theme(page)).toBe('glass');
    await expect(option(page, 'Glass')).toHaveAttribute('aria-checked', 'true');
    await page.goto('/items');
    expect(await theme(page)).toBe('glass');
  });

  test('glass panels are see-through and blurred, the other themes are not', async ({ page }) => {
    await page.goto('/items');
    const card = page.locator('.itemCard').first();
    await expect(card).toBeVisible();
    const style = () =>
      card.evaluate((el) => {
        const computed = getComputedStyle(el);
        return { background: computed.backgroundColor, blur: computed.backdropFilter };
      });

    expect((await style()).blur).toBe('none');
    await option(page, 'Glass').click();
    await expect.poll(async () => (await style()).blur).toContain('blur');
    expect((await style()).background).toMatch(/rgba\(255, 255, 255, 0\.\d+\)/);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });

  for (const name of ['Dark', 'Glass']) {
    test(`the ${name.toLowerCase()} theme fits the screen`, async ({ page }) => {
      // On a phone the switcher is one button that steps light -> dark -> glass.
      await page.goto('/');
      const cycle = page.locator('.themeCycle');
      await expect(option(page, name)).toBeHidden();
      for (let i = 0; i < 3 && (await theme(page)) !== name.toLowerCase(); i++) await cycle.click();
      expect(await theme(page)).toBe(name.toLowerCase());
      for (const path of ['/', '/items', '/login']) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${path} is ${overflow}px wider than the screen`).toBeLessThanOrEqual(1);
      }
    });
  }
});
