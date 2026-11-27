// What search engines ask a site for. The pages themselves are served by the client; the
// client's host passes requests for /sitemap.xml on to this API (see client/vercel.json and
// client/nginx.conf), because only the API knows which dishes are on sale.
import Item from '../models/item.model.js';
import { CATEGORIES } from '../utils/food.js';
import { clientUrl } from '../utils/mailer.js';

// Pages of the client that anybody can open, besides the dishes.
const PAGES = [
  '/',
  '/items',
  '/about',
  '/help',
  '/buying',
  '/selling',
  '/safety',
  '/standards',
  '/privacy',
  '/terms',
  '/contact',
];
// A sitemap may list 50,000 addresses.
const MAX_DISHES = 45_000;

const escapeXml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]
  );

const entry = (path, lastModified) =>
  [
    '  <url>',
    `    <loc>${escapeXml(clientUrl(path))}</loc>`,
    ...(lastModified ? [`    <lastmod>${lastModified.toISOString()}</lastmod>`] : []),
    '  </url>',
  ].join('\n');

export const getSitemap = async (req, res, next) => {
  try {
    // Only dishes a visitor can actually see: not paused, taken down or of a suspended cook.
    const dishes = await Item.find({ isAvailable: { $ne: false } })
      .select('_id updatedAt')
      .sort({ updatedAt: -1 })
      .limit(MAX_DISHES)
      .lean();

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...PAGES.map((path) => entry(path)),
      ...CATEGORIES.map((category) => entry(`/items?cat=${encodeURIComponent(category)}`)),
      ...dishes.map((dish) => entry(`/item/${dish._id}`, dish.updatedAt)),
      '</urlset>',
      '',
    ].join('\n');

    res
      .status(200)
      .set('Content-Type', 'application/xml; charset=utf-8')
      // New dishes show up within the hour; in between, the host's cache answers.
      .set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
      .send(xml);
  } catch (err) {
    next(err);
  }
};

// The API's own address holds data, not pages: nothing here belongs in search results.
export const getRobots = (req, res) => {
  res
    .status(200)
    .type('text/plain')
    .send(['User-agent: *', 'Allow: /sitemap.xml', 'Disallow: /', ''].join('\n'));
};
