// Descriptions of what is on a page in the vocabulary search engines understand
// (schema.org), so results can show a dish with its price, rating and availability.
import { siteUrl } from '../components/seo/Seo';

const CONTEXT = 'https://schema.org';

const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// The site itself, for the home page.
export const siteData = () => ({
  '@context': CONTEXT,
  '@graph': [
    {
      '@type': 'Organization',
      '@id': siteUrl('/#organization'),
      name: 'Taste of Home',
      url: siteUrl('/'),
      logo: siteUrl('/img/homemadefood.png'),
      description: 'A marketplace where home cooks sell homemade food to people nearby.',
    },
    {
      '@type': 'WebSite',
      '@id': siteUrl('/#website'),
      name: 'Taste of Home',
      url: siteUrl('/'),
      publisher: { '@id': siteUrl('/#organization') },
    },
  ],
});

// A dish, as a product on offer, and where its page sits in the site.
// `cook` is the seller's public profile, when it has loaded.
export const dishData = (dish, cook) => {
  const url = siteUrl(`/item/${dish._id}`);
  const reviews = dish.starNumber || 0;

  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#dish`,
        name: dish.title,
        description: dish.shortDesc || dish.desc,
        image: [dish.cover, ...(dish.images || [])].filter(Boolean),
        sku: dish._id,
        category: dish.cat,
        url,
        offers: {
          '@type': 'Offer',
          url,
          price: dish.price,
          priceCurrency: 'INR',
          availability: dish.isAvailable === false ? `${CONTEXT}/OutOfStock` : `${CONTEXT}/InStock`,
          ...(cook?.username && { seller: { '@type': 'Person', name: cook.username } }),
        },
        // Only real reviews: a rating without any would be refused by search engines.
        ...(reviews > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round((dish.totalStars / reviews) * 10) / 10,
            reviewCount: reviews,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl('/') },
          ...(dish.cat
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: titleCase(dish.cat),
                  item: siteUrl(`/items?cat=${encodeURIComponent(dish.cat)}`),
                },
              ]
            : []),
          { '@type': 'ListItem', position: dish.cat ? 3 : 2, name: dish.title, item: url },
        ],
      },
    ],
  };
};
