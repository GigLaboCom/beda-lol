import { defineConfig } from 'vitest/config';

// Unit tests for pure helpers in the web app (pages are checked in the browser).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
