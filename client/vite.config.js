import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Pages that only make sense for the person logged in. Search engines are asked not to
// fetch them.
const PRIVATE_PATHS = [
  "/admin",
  "/orders",
  "/messages",
  "/message/",
  "/profile",
  "/favourites",
  "/cart",
  "/checkout",
  "/pay/",
  "/success",
  "/myitems",
  "/add",
  "/edit/",
];

// Fills in what search engines and link previews need to know about where the site lives:
// absolute addresses in index.html, and a robots.txt that points at the sitemap.
const seoFiles = (env) => {
  // The public address of the site. VITE_SUCCESS_URL is already required and is on it.
  const site = (
    env.VITE_SITE_URL ||
    (env.VITE_SUCCESS_URL ? new URL(env.VITE_SUCCESS_URL).origin : "")
  ).replace(/\/$/, "");

  return {
    name: "seo-files",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => html.replaceAll("%SITE_URL%", site),
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: [
          "User-agent: *",
          "Allow: /",
          ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
          "",
          // Served by the API through this host (see vercel.json and nginx.conf). The
          // address has to be a full one, so it is left out when the site's is not known.
          ...(site ? [`Sitemap: ${site}/sitemap.xml`, ""] : []),
        ].join("\n"),
      });
    },
  };
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DAY = 24 * 60 * 60;

// Makes the site installable and lets it open without a connection: the app itself is stored
// on the device, and so is what a visitor has already looked at (dishes, reviews, cooks).
// Nothing personal is stored: orders, messages and account details always need a connection.
const installable = (env) => {
  const api = escapeRegex(env.VITE_BASEURL || "/api/");
  const id = "[0-9a-f]{24}";
  // Public reads only. A list filtered to one cook ("userId=") is that cook's own view of
  // their listings and is left out.
  const publicReads = new RegExp(
    `^${api}(?:items(?:\\?(?!.*userId=).*)?|items/single/${id}|reviews/${id}|users/${id}(?:/stats)?|ai/status|ai/review-summary/${id})$`,
  );

  return VitePWA({
    // A new version waits until the visitor agrees to reload (see src/pwa.jsx), so nobody
    // loses a half-typed message or a checkout to an update.
    registerType: "prompt",
    injectRegister: false,
    includeAssets: ["icons/*", "img/*"],
    manifest: {
      name: "Taste of Home",
      short_name: "Taste of Home",
      description: "Homemade food from home cooks near you.",
      lang: "en",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#fbf7f1",
      theme_color: "#c9410d",
      categories: ["food", "shopping"],
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        { name: "Explore the food", url: "/items" },
        { name: "My orders", url: "/orders" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html}"],
      // Every page of the app is the same file; these two are not pages.
      navigateFallback: "/index.html",
      navigateFallbackDenylist: [/^\/sitemap\.xml$/, /^\/robots\.txt$/],
      cleanupOutdatedCaches: true,
      // Start working for the page that is already open, so what a visitor looks at on their
      // very first visit is saved too. (An update still waits for the visitor, see above.)
      clientsClaim: true,
      runtimeCaching: [
        {
          // Fresh from the network when there is one; the last saved copy when there is not
          // (or when the network takes too long to answer).
          urlPattern: publicReads,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-public",
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 200, maxAgeSeconds: 7 * DAY },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          // Dish photos.
          urlPattern: /^https:\/\/res\.cloudinary\.com\//,
          handler: "CacheFirst",
          options: {
            cacheName: "dish-photos",
            expiration: { maxEntries: 60, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
          handler: "StaleWhileRevalidate",
          options: { cacheName: "font-styles" },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
          handler: "CacheFirst",
          options: {
            cacheName: "font-files",
            expiration: { maxEntries: 20, maxAgeSeconds: 365 * DAY },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
  });
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return { plugins: [react(), tailwind(), seoFiles(env), installable(env)] };
});
