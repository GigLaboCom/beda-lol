import { defineConfig } from 'vitest/config';

// Workspace-level Vitest: `pnpm vitest` at the root runs every package's tests.
// Nx runs each package's own `test` script (`vitest run`) with caching.
export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
});
