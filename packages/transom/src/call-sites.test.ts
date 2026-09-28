// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Replaceability (PLAN §2): pages use the transom only through its public
 * API, so a new font or renderer changes only this package, and the board's
 * word comes from `@beda/core`, not from literals in components.
 */
const web = fileURLToPath(new URL('../../../apps/web/src/', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(astro|tsx?|css)$/.test(name) ? [path] : [];
  });
}

const sources = files(web)
  .filter((f) => !relative(web, f).startsWith('i18n'))
  .map((f) => ({ file: relative(web, f), text: readFileSync(f, 'utf8') }));
const components = sources.filter((s) => s.file.startsWith('components'));

describe('transom call sites', () => {
  it('spell no board word in components (it comes from @beda/core)', () => {
    for (const { file, text } of components) {
      expect(text, file).not.toMatch(/ПОБЕДА|БЕДА/);
    }
  });

  it('import only the public entry points', () => {
    const allowed = new Set(['', '/client', '/Transom.astro', '/transom.css', '/timeline']);
    for (const { file, text } of sources) {
      for (const [, sub] of text.matchAll(/['"]@beda\/transom(\/[^'"]*)?['"]/g)) {
        expect(allowed.has(sub ?? ''), `${file}: @beda/transom${sub}`).toBe(true);
      }
    }
  });

  it('reach into no board internals (classes, layers, custom properties)', () => {
    const internals = /\.slot\b|\.nail\b|\.hole\b|layer-|\.t-brass|--hang|--drop|data-v\b|mounts/;
    for (const { file, text } of sources.filter((s) => !s.file.startsWith('pages/dev/'))) {
      expect(text, file).not.toMatch(internals);
    }
  });
});
