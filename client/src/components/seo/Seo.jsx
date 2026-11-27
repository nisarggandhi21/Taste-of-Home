import { Helmet } from 'react-helmet-async';

// The address of a page of this site as the rest of the web should know it.
export const siteUrl = (path = '') => `${window.location.origin}${path}`;

// "<" is escaped so that text typed by users can never close the script element early.
const toJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

// Everything a page tells search engines and link previews about itself. Every value is
// optional; what a page leaves out keeps the site-wide default set in App.jsx.
//
//   path     the page's own address ("/item/123"), given as its canonical address
//   noindex  keeps the page out of search results
//   jsonLd   structured data (schema.org) describing what is on the page
const Seo = ({ title, description, path, image, type, noindex, jsonLd }) => (
  <Helmet>
    {title && <title>{title}</title>}
    {title && <meta property="og:title" content={title} />}
    {title && <meta name="twitter:title" content={title} />}
    {description && <meta name="description" content={description} />}
    {description && <meta property="og:description" content={description} />}
    {description && <meta name="twitter:description" content={description} />}
    {image && <meta property="og:image" content={image} />}
    {image && <meta name="twitter:image" content={image} />}
    {type && <meta property="og:type" content={type} />}
    {path && <link rel="canonical" href={siteUrl(path)} />}
    {path && <meta property="og:url" content={siteUrl(path)} />}
    {noindex !== undefined && (
      <meta name="robots" content={noindex ? 'noindex' : 'index, follow'} />
    )}
    {jsonLd && <script type="application/ld+json">{toJson(jsonLd)}</script>}
  </Helmet>
);

export default Seo;
