// @ts-check
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

// Public site URL: canonical links and sitemaps are built from it.
const site = process.env.BEDA_BASE_URL ?? 'https://beda.lol';

export default defineConfig({
  site,
  // Pages are prerendered by default; UGC, personal and service routes opt out
  // with `export const prerender = false` and are served by the Node server.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact()],
  vite: {
    server: {
      // Same origin in dev as in prod: /api goes to the Rust API.
      proxy: {
        '/api': { target: 'http://localhost:8080', changeOrigin: false },
      },
    },
  },
});
