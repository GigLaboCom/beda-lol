import { existsSync, readFileSync } from 'node:fs';
import { readTokens } from '@beda/tokens/read';
import { describe, expect, it } from 'vitest';
import {
  aliases,
  BRAND_BACKGROUND,
  BRAND_BACKGROUND_DARK,
  BRAND_COLOR,
  BROWSERCONFIG,
  browserconfigXml,
  headLinks,
  headMeta,
  manifestIcons,
  rasterIcons,
  vectorIcons,
} from './icons';
import { iconSvg, loadTile } from './render';

/**
 * The icon set is generated ahead of time and committed, so a reference can
 * outlive the file it points at — a broken favicon is invisible in a
 * screenshot and never fails a build. These tests close that gap.
 *
 * Regenerate with `task brand:icons` when they fail.
 */
const PUBLIC_DIR = new URL('../../../apps/web/public/', import.meta.url);
const publicFile = (url: string) => new URL(url.replace(/^\//, ''), PUBLIC_DIR);

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: URL): [number, number] {
  const data = readFileSync(file);
  expect(data.subarray(1, 4).toString('latin1')).toBe('PNG');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

describe('brand icons', () => {
  const referenced = [
    ...headLinks.filter((l) => l.rel !== 'manifest').map((l) => l.href),
    ...manifestIcons.map((i) => i.src),
    ...headMeta.filter((m) => m.name === 'msapplication-config').map((m) => m.content),
  ];

  it.for(referenced)('%s is present in public/', (url) => {
    expect(existsSync(publicFile(url)), `${url} is missing`).toBe(true);
  });

  it.for(rasterIcons.map((i) => [i.file, i.size] as const))('%s is %ipx square', ([file, size]) => {
    expect(pngSize(publicFile(file))).toEqual([size, size]);
  });

  it('keeps aliases identical to their originals', () => {
    for (const [from, to] of aliases) {
      expect(readFileSync(publicFile(to)).equals(readFileSync(publicFile(from)))).toBe(true);
    }
  });

  it.for(vectorIcons.map((i) => [i.file, i.source] as const))(
    '%s is up to date with tile.svg',
    ([file, source]) => {
      expect(readFileSync(publicFile(file), 'utf8')).toBe(iconSvg(loadTile(), source));
    },
  );

  it('writes the current browserconfig.xml', () => {
    const xml = readFileSync(publicFile(BROWSERCONFIG), 'utf8');
    expect(xml).toBe(browserconfigXml());
    const srcs = [...xml.matchAll(/src="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(srcs).toHaveLength(3);
    for (const src of srcs) expect(existsSync(publicFile(src)), `${src} is missing`).toBe(true);
  });

  it('offers the SVG favicon before the raster fallbacks', () => {
    // Browsers take the first icon they understand; the vector last would pin everyone to a bitmap.
    expect(headLinks[0]).toMatchObject({
      rel: 'icon',
      href: '/favicon.svg',
      type: 'image/svg+xml',
    });
  });

  it('declares a size for every raster link', () => {
    for (const link of headLinks.filter((l) => l.href.endsWith('.png'))) {
      expect(link.sizes, `${link.href} has no sizes`).toMatch(/^\d+x\d+$/);
    }
  });

  it('gives the manifest a 192 and a 512 icon for both purposes', () => {
    for (const purpose of ['any', 'maskable'] as const) {
      const sizes = manifestIcons.filter((i) => i.purpose === purpose).map((i) => i.sizes);
      expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    }
  });
});

describe('brand colours', () => {
  it('match the design tokens', () => {
    expect(readTokens().tar).toBe(BRAND_BACKGROUND);
    expect(readTokens('dark').tar).toBe(BRAND_BACKGROUND_DARK);
    expect(readTokens().brass).toBe(BRAND_COLOR);
  });

  it('match the tile artwork', () => {
    const tile = loadTile();
    expect(tile.fill.toLowerCase()).toBe(BRAND_BACKGROUND);
    expect(tile.mark.toLowerCase()).toContain(`stroke="${BRAND_COLOR}"`);
  });
});
