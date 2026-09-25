// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// Public site URL: canonical links, OG and sitemaps are built from it.
const site = process.env.BEDA_BASE_URL ?? 'https://beda.lol';

// Pillar articles still marked `draft: true` carry noindex and stay out of the sitemap.
const pillarsDir = new URL('./src/content/pillars/', import.meta.url);
const pillarFiles = readdirSync(pillarsDir).filter((f) => f.endsWith('.md'));
const draftPaths = pillarFiles
  .filter((f) => /^draft:\s*true\s*$/m.test(readFileSync(new URL(f, pillarsDir), 'utf8')))
  .map((f) => `/bukvy/${f.replace(/\.md$/, '')}`);
if (draftPaths.length === pillarFiles.length) draftPaths.push('/bukvy');

/** @param {string} page absolute URL */
function inSitemap(page) {
  const path = new URL(page).pathname.replace(/\/$/, '') || '/';
  if (path.startsWith('/dev') || path.startsWith('/osmotr/r/') || path === '/404') return false;
  return !draftPaths.includes(path);
}

export default defineConfig({
  site,
  // One URL per page: no trailing slash (Caddy and the Node server redirect).
  trailingSlash: 'never',
  // Pages are prerendered by default; UGC, personal and service routes opt out
  // with `export const prerender = false` and are served by the Node server.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact(), sitemap({ filter: inSitemap })],
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
        '/api': { target: 'http://localhost:8080', changeOrigin: false },
      },
    },
  },
});
