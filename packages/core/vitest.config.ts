import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        'src/quiz.ts': { lines: 90 },
        'src/result-code.ts': { lines: 90 },
        'src/namer.ts': { lines: 90 },
      },
    },
  },
});
