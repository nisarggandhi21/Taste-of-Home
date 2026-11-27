import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

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

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwind(), seoFiles(loadEnv(mode, process.cwd(), "VITE_"))],
}));
