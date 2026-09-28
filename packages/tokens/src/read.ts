/**
 * Design tokens as values, for Node-side renderers (share images, icons) that
 * cannot use CSS custom properties. Parses `tokens.css`, the only source.
 * Node only: reads the file.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `base` is the `:root` palette (dark-first, what share images use); `dark`
 * applies the `[data-theme="dark"]` overrides on top.
 */
export type TokenScheme = 'base' | 'dark';

const declarations = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1], (m[2] ?? '').trim()]),
  );

/** Custom properties (name without `--`) → value, from the text of `tokens.css`. */
export function parseTokens(css: string, scheme: TokenScheme = 'base'): Record<string, string> {
  const block = (selector: string) => {
    const at = css.indexOf(selector);
    if (at < 0) return '';
    const open = css.indexOf('{', at);
    return css.slice(open + 1, css.indexOf('}', open));
  };
  const base = declarations(block(':root {'));
  return scheme === 'dark' ? { ...base, ...declarations(block(':root[data-theme="dark"]')) } : base;
}

/** The tokens of `packages/tokens/src/tokens.css`. */
export function readTokens(scheme: TokenScheme = 'base'): Record<string, string> {
  // A path, not a URL: DOM test environments replace the global URL.
  const file = join(dirname(fileURLToPath(import.meta.url)), 'tokens.css');
  return parseTokens(readFileSync(file, 'utf8'), scheme);
}
