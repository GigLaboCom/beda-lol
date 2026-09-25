import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

describe('tokens.css', () => {
  it.each([
    '--tar',
    '--hull',
    '--plank',
    '--brass',
    '--rust',
    '--sea-muted',
    '--display',
    '--sans',
    '--mono',
  ])('defines %s', (name) => {
    expect(css).toMatch(new RegExp(`${name}\\s*:`));
  });

  it('keeps the dark-scheme and data-theme overrides', () => {
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain(':root[data-theme="dark"]');
  });
});
