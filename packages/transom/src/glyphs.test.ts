// @vitest-environment node
import { readFileSync } from 'node:fs';
import { BOARD_CHARSET, BREAKS, breakFrom, FALLING } from '@beda/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { GLYPHS_CONFIG } from '../glyphs.config';
import { buildGlyphs, type GlyphBuild } from '../scripts/glyphs-build';
import { inPolygon } from './glyph-analysis';
import { type Glyph, glyphFor, loadExt, needsExt } from './glyphs';
import { PIECES } from './pieces';

/**
 * The glyph tables are generated from the font and committed. These tests
 * pin the physics (hang angles) and guard a font swap: run
 * `task transom:glyphs` after changing `glyphs.config.ts`, the pieces, the
 * geometry or the analysis, then fix whatever fails here.
 */
const root = new URL('../../../', import.meta.url);
let build: GlyphBuild;
beforeAll(() => {
  build = buildGlyphs();
}, 60_000);

const glyph = (ch: string): Glyph => {
  const g = build.glyphs[ch];
  if (!g) throw new Error(`no glyph ${ch}`);
  return g;
};

describe('generated files', () => {
  it('equal a fresh run (regenerate with `task transom:glyphs`)', () => {
    for (const [path, text] of Object.entries(build.files)) {
      expect(readFileSync(new URL(path, root), 'utf8'), path).toBe(text);
    }
  });

  it('expose the same charset to @beda/core', () => {
    expect(Array.from(BOARD_CHARSET)).toEqual(build.charset);
    expect(Array.from(FALLING)).toEqual(build.falling);
  });
});

describe('hang angles', () => {
  // S08a-findings.md §3a (new method), ±1°. No hinge overrides are configured
  // (D9); an override moves its letter's expectation. Т>Г: the prototype mask
  // left a crumb of the bar's serif that the hinge snapped to (68.4°); with
  // the crumb inside the piece the remainder hangs on its own metal (20.7°).
  const reference: [string, number][] = [
    ['П', 47.5],
    ['О', 121.9],
    ['А', 30.8],
    ['Д', 35.5],
    ['Б', 37.1],
    ['Е', 33.6],
    ['Д>Л', 46.8],
    ['Т>Г', 20.7],
    ['B>P', 40.3],
    ['R>P', 41.1],
    ['G>C', 147.7],
    ['О>С', 132.5],
  ];

  it('has no hinge overrides, so the references hold', () => {
    expect(GLYPHS_CONFIG.hinges).toEqual({});
  });

  it.for(reference)('%s hangs at %s°', ([key, deg]) => {
    const g = glyph(Array.from(key)[0] as string);
    const hang = key.includes('>') ? g.breaks?.[key as (typeof BREAKS)[number]]?.hang : g.hang;
    expect(Math.abs((hang ?? Number.NaN) - deg)).toBeLessThanOrEqual(1);
  });

  it('is finite and within (−180°, 180°) for every falling glyph and break', () => {
    for (const ch of build.falling) {
      const g = glyph(ch);
      const hangs = [g.hang, ...Object.values(g.breaks ?? {}).map((b) => b?.hang)];
      for (const h of hangs) {
        expect(Number.isFinite(h), ch).toBe(true);
        expect(Math.abs(h as number), ch).toBeLessThan(180);
      }
    }
  });

  it('uses the exact centroid, which agrees with the raster within 0.01 em', () => {
    for (const ch of build.falling) {
      expect(build.checks[ch]?.centroidDelta, ch).toBeLessThan(0.01);
    }
  });
});

describe('charset', () => {
  it('draws every character of the charset', () => {
    expect(build.charset.length).toBeGreaterThan(250);
    for (const ch of build.charset) expect(glyph(ch).d, ch).toMatch(/^M/);
  });

  it('includes every core character', () => {
    for (const ch of GLYPHS_CONFIG.core) expect(build.charset, ch).toContain(ch);
  });

  it('nails falling glyphs with four nails and fixed ones with one to four', () => {
    for (const ch of build.charset) {
      const g = glyph(ch);
      if (g.falls) {
        expect(g.nails, ch).toHaveLength(4);
        expect(g.centroid, ch).toBeDefined();
        expect(g.drop, ch).toBeGreaterThan(0);
      } else {
        expect([1, 2, 4], ch).toContain(g.nails.length);
        expect(g.hang, ch).toBeUndefined();
        expect(g.breaks, ch).toBeUndefined();
      }
    }
    expect(glyph('.').nails).toHaveLength(1);
    expect(glyph('-').nails).toHaveLength(2);
    expect(glyph('№').nails).toHaveLength(4);
  });

  it('lets letters and digits fall, and nothing else', () => {
    expect(glyph('Я').falls).toBe(true);
    expect(glyph('7').falls).toBe(true);
    expect(glyph('Ẁ').falls).toBe(true);
    expect(glyph('!').falls).toBe(false);
    expect(glyph('ʼ').falls).toBe(false);
  });

  it('splits core and ext, and loads ext on demand', async () => {
    expect(glyphFor('П')).toBeDefined();
    expect(needsExt('ПОБЕДА 2.0')).toBe(false);
    expect(needsExt('ÉTÉ')).toBe(true);
    await loadExt();
    expect(glyphFor('É')).toEqual(glyph('É'));
  });
});

describe('breaks', () => {
  it('has a piece for every break and no other', () => {
    expect(Object.keys(PIECES).sort()).toEqual([...BREAKS].sort());
  });

  it.for([...BREAKS])(
    '%s: nails outside the piece, which cuts ink and leaves one region',
    (key) => {
      const g = glyph(breakFrom(key));
      const b = g.breaks?.[key];
      expect(b).toBeDefined();
      if (!b) return;
      expect(b.nails).toHaveLength(4);
      for (const n of b.nails) expect(inPolygon(n, b.poly)).toBe(false);
      const check = build.breakChecks[key];
      expect(check?.inside).toBeGreaterThan(0);
      expect(check?.outside).toBeGreaterThan(0);
      expect(check?.regions).toBe(1);
      expect(b.drop).toBeGreaterThan(0);
    },
  );
});

describe('config', () => {
  it('names the same display font as packages/tokens', () => {
    const tokens = readFileSync(new URL('packages/tokens/src/tokens.css', root), 'utf8');
    const fonts = readFileSync(new URL('packages/tokens/src/fonts.css', root), 'utf8');
    expect(tokens).toMatch(new RegExp(`--display:\\s*"${GLYPHS_CONFIG.family}"`));
    const slug = GLYPHS_CONFIG.family.toLowerCase().replace(/ /g, '-');
    expect(fonts).toContain(`@fontsource/${slug}/latin-${GLYPHS_CONFIG.weight}.css`);
    for (const file of GLYPHS_CONFIG.fonts) {
      expect(file).toContain(`@fontsource/${slug}/`);
      expect(file).toContain(`-${GLYPHS_CONFIG.weight}-normal`);
    }
  });
});
