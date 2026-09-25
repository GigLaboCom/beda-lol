// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mountsCss } from './mounts';

describe('mounts.css', () => {
  it('is in sync with MOUNTS (run `pnpm --filter @beda/transom gen` after changing mounts)', () => {
    const file = readFileSync(new URL('./mounts.css', import.meta.url), 'utf8');
    expect(file).toBe(mountsCss());
  });

  it('keeps О toppling around its lower-left rivet', () => {
    expect(mountsCss()).toContain(
      '.slot[data-m="o"] {\n  --ox: 0.09em;\n  --oy: 0.72em;\n  --hang: 124deg;\n}',
    );
  });
});
