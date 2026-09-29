import { defineConfig } from '@playwright/test';

/**
 * Browser checks against a running local stack (`task dev`: Supabase with Mailpit, the
 * Rust API, `astro dev`). Not part of `task check`: run `pnpm --filter web e2e`
 * (docs/local-dev.md). Mobile-first, so the default viewport is a phone.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  timeout: 60_000,
  use: {
    baseURL: process.env.BEDA_E2E_BASE_URL ?? 'http://localhost:4321',
    viewport: { width: 375, height: 900 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
