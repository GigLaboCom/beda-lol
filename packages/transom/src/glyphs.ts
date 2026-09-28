/**
 * Letter geometry for the board, generated from the font at build time
 * (`scripts/gen-glyphs.ts`, inputs in `glyphs.config.ts`). All numbers are
 * glyph units (`UNITS_PER_EM` per em), y down, origin at the pen position
 * on the baseline.
 *
 * The common characters ship in `glyphs.core.gen.ts`; the rest (accented
 * Latin, other Cyrillic letters, rare symbols) in `glyphs.ext.gen.ts`, which
 * `loadExt()` imports on demand.
 */
import type { BreakKey } from '@beda/core';
import { GLYPHS_CORE } from './glyphs.core.gen';

export type Point = readonly [x: number, y: number];

/** What changes when a piece breaks off: the piece, and the remainder's nails and hang. */
export interface GlyphBreak {
  /** The piece's outline. */
  poly: readonly Point[];
  /** The piece's centroid: it tumbles about it on the way down. */
  centroid: Point;
  /** How far the piece drops to the shelf. */
  drop: number;
  /** The remainder's nails, snapped outside the piece; `nails[0]` is the hinge. */
  nails: readonly Point[];
  /** The remainder's centroid. */
  rest: Point;
  /** The remainder's hang angle on its hinge, degrees. */
  hang: number;
}

export interface Glyph {
  /** SVG path data, integers. */
  d: string;
  /** Advance width. */
  adv: number;
  /** Ink box: left, top, right, bottom. */
  ink: readonly [number, number, number, number];
  /** Whether the glyph can fall off or break (letters and digits). */
  falls: boolean;
  /** Where it is nailed; `nails[0]` is the hinge. Four for falling glyphs, one to four for fixed ones. */
  nails: readonly Point[];
  /** Falling glyphs only: centroid, hang angle on the hinge (degrees), drop to the shelf. */
  centroid?: Point;
  hang?: number;
  drop?: number;
  /** The breaks this glyph can take. */
  breaks?: Partial<Record<BreakKey, GlyphBreak>>;
}

export type GlyphTable = Readonly<Record<string, Glyph>>;

let ext: GlyphTable | undefined;

/** The geometry of a character, or `undefined` if the board can't draw it (or it is in ext, not loaded yet). */
export function glyphFor(char: string): Glyph | undefined {
  return GLYPHS_CORE[char] ?? ext?.[char];
}

/** Whether drawing `text` needs `loadExt()` first. */
export function needsExt(text: string): boolean {
  return Array.from(text).some((ch) => ch !== ' ' && !(ch in GLYPHS_CORE));
}

/** Load the rest of the charset (accented Latin, other Cyrillic letters, rare symbols). */
export async function loadExt(): Promise<void> {
  ext ??= (await import('./glyphs.ext.gen')).GLYPHS_EXT;
}
