// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// Public site URL: canonical links, OG and sitemaps are built from it.
const site = process.env.BEDA_BASE_URL ?? 'https://beda.lol';

// Where `astro dev` proxies /api: the API on the host or in the local compose
// stack (default), or any running backend, e.g. BEDA_API_URL=https://beda.lol.
const apiUrl = process.env.BEDA_API_URL ?? 'http://localhost:8080';

// Interface for `astro dev`, `astro preview` and the standalone server: all of
// them by default, like the API, so a dev container or a phone on the LAN can
// reach it. BEDA_WEB_HOST=127.0.0.1 keeps it local. At runtime HOST still wins.
const host = process.env.BEDA_WEB_HOST ?? '0.0.0.0';

// Pillar articles still marked `draft: true` carry noindex and stay out of the sitemap.
const pillarsDir = new URL('./src/content/pillars/', import.meta.url);
const pillarFiles = readdirSync(pillarsDir).filter((f) => f.endsWith('.md'));
const draftPaths = pillarFiles
  .filter((f) => /^draft:\s*true\s*$/m.test(readFileSync(new URL(f, pillarsDir), 'utf8')))
  .map((f) => `/bukvy/${f.replace(/\.md$/, '')}`);
if (draftPaths.length === pillarFiles.length) draftPaths.push('/bukvy');

// Legal pages still marked `draft: true`, per locale (`src/content/legal/<lang>/<page>.md`).
const legalDir = new URL('./src/content/legal/', import.meta.url);
const legalDrafts = readdirSync(legalDir).flatMap((lang) =>
  readdirSync(new URL(`${lang}/`, legalDir))
    .filter((f) =>
      /^draft:\s*true\s*$/m.test(readFileSync(new URL(`${lang}/${f}`, legalDir), 'utf8')),
    )
    .map((f) => `${lang === 'ru' ? '' : `/${lang}`}/${f.replace(/\.md$/, '')}`),
);

/** @param {string} page absolute URL */
function inSitemap(page) {
  const path = new URL(page).pathname.replace(/\/$/, '') || '/';
  // Match rules against the locale-stripped path so both languages are covered.
  const bare = path === '/en' ? '/' : path.startsWith('/en/') ? path.slice(3) : path;
  if (bare.startsWith('/dev') || bare.startsWith('/osmotr/r/') || bare === '/404') return false;
  // Personal pages (noindex).
  if (bare === '/voiti' || bare === '/kabinet') return false;
  // English pillar articles are untranslated stubs (noindex): keep them out.
  if (path.startsWith('/en/bukvy/')) return false;
  if (legalDrafts.includes(path)) return false;
  return !draftPaths.includes(bare);
}

export default defineConfig({
  site,
  // One URL per page: no trailing slash (Caddy and the Node server redirect).
  trailingSlash: 'never',
  // Russian is the default and stays unprefixed; English lives under /en/.
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  server: { host },
  // Pages are prerendered by default; UGC, personal and service routes opt out
  // with `export const prerender = false` and are served by the Node server.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    preact(),
    sitemap({
      i18n: { defaultLocale: 'ru', locales: { ru: 'ru-RU', en: 'en-US' } },
      filter: inSitemap,
    }),
  ],
  security: {
    // Astro hashes its own scripts and styles; nothing else may run.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
    },
  },
  vite: {
    server: {
      // Same origin in dev as in prod: /api goes to the Rust API.
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: !apiUrl.startsWith('http://localhost'),
          secure: true,
        },
      },
    },
  },
});
