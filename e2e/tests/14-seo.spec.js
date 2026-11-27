import { expect, test } from '@playwright/test';

const ORIGIN = 'http://localhost:5173';

const head = (page, selector, attribute = 'content') =>
  page.locator(`head ${selector}`).getAttribute(attribute);
// The structured data on the page, as the list of things it describes.
const structuredData = async (page) => {
  const scripts = page.locator('head script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  return JSON.parse(await scripts.textContent())['@graph'];
};
const openDish = async (page, title) => {
  await page.goto(`/items?search=${encodeURIComponent(title)}`);
  await page.locator('.itemCard', { hasText: title }).first().click();
  await expect(page.locator('.item h1')).toHaveText(title);
  return new URL(page.url()).pathname;
};

test('a dish page describes the dish to search engines', async ({ page }) => {
  const path = await openDish(page, 'Chicken Biryani');

  await expect(page).toHaveTitle('Chicken Biryani | Taste of Home');
  expect(await head(page, 'link[rel="canonical"]', 'href')).toBe(`${ORIGIN}${path}`);
  expect(await head(page, 'meta[property="og:url"]')).toBe(`${ORIGIN}${path}`);
  expect(await head(page, 'meta[property="og:type"]')).toBe('product');
  expect(await head(page, 'meta[property="og:image"]')).toBe('https://example.com/cover.png');
  expect(await head(page, 'meta[name="robots"]')).toBe('index, follow');
  // The page's own tags replace the site-wide ones instead of piling up next to them.
  for (const selector of [
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property="og:title"]',
    'meta[property="og:image"]',
    'link[rel="canonical"]',
  ]) {
    await expect(page.locator(`head ${selector}`), selector).toHaveCount(1);
  }

  const [dish, trail] = await structuredData(page);
  expect(dish['@type']).toBe('Product');
  expect(dish.name).toBe('Chicken Biryani');
  expect(dish.image).toEqual(['https://example.com/cover.png']);
  expect(dish.offers).toMatchObject({
    '@type': 'Offer',
    price: 300,
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
    url: `${ORIGIN}${path}`,
    seller: { '@type': 'Person', name: 'pune-cook' },
  });
  // Three buyers gave 5, 4 and 3 stars.
  expect(dish.aggregateRating).toMatchObject({
    ratingValue: 4,
    reviewCount: 3,
  });

  expect(trail['@type']).toBe('BreadcrumbList');
  expect(trail.itemListElement.map((step) => step.name)).toEqual([
    'Home',
    'North',
    'Chicken Biryani',
  ]);
  expect(trail.itemListElement[1].item).toBe(`${ORIGIN}/items?cat=north`);
});

test('a dish nobody has reviewed claims no rating', async ({ page }) => {
  await openDish(page, 'Laddu Box 3');
  const [dish] = await structuredData(page);
  expect(dish.name).toBe('Laddu Box 3');
  expect('aggregateRating' in dish).toBe(false);
});

test('lists are indexed by category, search results are not', async ({ page }) => {
  await page.goto('/items?cat=burger');
  await expect(page).toHaveTitle('Authentic Burger | Taste of Home');
  expect(await head(page, 'link[rel="canonical"]', 'href')).toBe(`${ORIGIN}/items?cat=burger`);
  expect(await head(page, 'meta[name="robots"]')).toBe('index, follow');

  await page.goto('/items?search=thali');
  await expect(page.locator('.items .count')).toBeVisible();
  expect(await head(page, 'meta[name="robots"]')).toBe('noindex');

  // Going on to another page puts its own values back.
  await page.goto('/about');
  await expect(page).toHaveTitle('About Taste of Home | Taste of Home');
  expect(await head(page, 'meta[name="robots"]')).toBe('index, follow');
  expect(await head(page, 'link[rel="canonical"]', 'href')).toBe(`${ORIGIN}/about`);
  await expect(page.locator('head script[type="application/ld+json"]')).toHaveCount(0);
});

test('the home page introduces the site, and private pages stay out of search', async ({
  page,
}) => {
  await page.goto('/');
  const [organization, site] = await structuredData(page);
  expect(organization).toMatchObject({
    '@type': 'Organization',
    name: 'Taste of Home',
  });
  expect(site).toMatchObject({ '@type': 'WebSite', url: `${ORIGIN}/` });
  expect(await head(page, 'link[rel="canonical"]', 'href')).toBe(`${ORIGIN}/`);

  await page.goto('/login');
  await expect(page).toHaveTitle('Login | Taste of Home');
  expect(await head(page, 'meta[name="robots"]')).toBe('noindex, nofollow');
  await expect(page.locator('head meta[name="robots"]')).toHaveCount(1);

  await page.goto('/item/000000000000000000000000');
  await expect(page).toHaveTitle('Dish not found | Taste of Home');
  expect(await head(page, 'meta[name="robots"]')).toBe('noindex');
});
