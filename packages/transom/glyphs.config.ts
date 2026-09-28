/**
 * Every input of the glyph generator (`scripts/gen-glyphs.ts`). To change the
 * transom font, edit this file and run `task transom:glyphs`; nothing else
 * names a font file, a charset or a raster setting. Then check the break
 * pieces by rendering (`/dev/animacii`): they are tuned to the letter shapes.
 */
export const GLYPHS_CONFIG = {
  /** Must match the display font in `packages/tokens` (a test checks). */
  family: 'Playfair Display',
  weight: 900,
  /**
   * Font files, resolved from this package. Earlier files win when two have
   * the same character. Vietnamese stays out: its letters reach the board
   * through the name game's normaliser (Ệ → E).
   */
  fonts: [
    '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff',
    '@fontsource/playfair-display/files/playfair-display-latin-ext-900-normal.woff',
    '@fontsource/playfair-display/files/playfair-display-cyrillic-900-normal.woff',
  ],
  /**
   * What the board can show: every character of the fonts that matches
   * `drawable` and is its own upper case (the name game upper-cases input).
   */
  drawable: /^[\p{L}\p{N}\p{P}\p{S}]$/u,
  /**
   * What can fall off or break: letters and digits. Everything else drawable
   * (punctuation, symbols, modifier letters) is nailed on for good.
   */
  falling: /^(?!\p{Lm})[\p{L}\p{N}]$/u,
  /**
   * Shipped with every board (`glyphs.core.gen.ts`); the rest goes to
   * `glyphs.ext.gen.ts`, loaded only when a name needs it.
   */
  core: [
    'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
    '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    '«»—№€',
  ].join(''),
  /** Raster resolution for the analysis, pixels per em. */
  pxPerEm: 240,
  /** Ink box: pixels with alpha above this. */
  inkAlpha: 128,
  /** Nails snap to pixels with alpha above this (well inside the metal). */
  nailAlpha: 160,
  /** Round letters: riveted along the sides, hinged on the lower-left rivet. */
  rivets: 'OQCGSОСЭЮФ',
  /**
   * Per-glyph hinge targets, `[fx, fy]` in fractions of the ink box, instead
   * of the default target (decision D9). Only the hinge moves; the angle is
   * still computed. None for now; e.g. `А: [0.5, 0.05]` hangs А on its apex.
   */
  hinges: {} as Readonly<Record<string, readonly [number, number]>>,
  /**
   * Fixed glyphs get nails by ink size (largest side, em): below `one` a
   * single nail at the ink centre, below `two` two at the ends of the long
   * side, otherwise four at the corners.
   */
  fixedNails: { one: 0.25, two: 0.45 },
} as const;

export type GlyphsConfig = typeof GLYPHS_CONFIG;
