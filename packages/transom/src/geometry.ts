/**
 * Board geometry, in em of the board's font size (one em = one letter
 * height). The one place for these numbers: the renderer, the share images
 * and the glyph generator read them from here. Today's CSS (`transom.css`)
 * and `apps/web/scripts/og.ts` still carry copies until S08c and S13a move
 * them over.
 */

/** User units per em in the glyph data and in the board SVG (font units, integers). */
export const UNITS_PER_EM = 1000;

/** Height of a letter slot. */
export const SLOT_H = 1.07;
/** Baseline, from the top of the slot. */
export const BASELINE = 0.95;
/** Gap between slots. */
export const GAP = 0.1;
/** Width of a space between words. */
export const SPACE = 0.35;
/** Board padding: left and right, top, bottom. */
export const PAD_X = 0.4;
export const PAD_TOP = 0.46;
export const PAD_BOTTOM = 0.5;
/** Planks: height of one plank and of the seam under it. */
export const PLANK = 0.4;
export const SEAM = 0.02;
/** Shelf under the board: gap above it, height, top edge, widest. */
export const SHELF_GAP = 0.52;
export const SHELF_H = 0.55;
export const SHELF_TOP = 0.09;
export const SHELF_MAX_W = 7;
/** Nail radius; the hole under it is this much smaller. */
export const NAIL_R = 0.036;
export const HOLE_SCALE = 0.72;
/** Where a popped nail ends up, relative to its place. */
export const NAIL_OFF = [-0.08, 1.25] as const;
/** Engraved look: the dark copy of the letter sits this far below it. */
export const SHADOW_DY = 0.025;
/** Fallen letters come to rest this far below the shelf's top edge. */
export const DROP_REST = 0.03;
/** How much of a piece's height above its centroid adds to its drop. */
export const PIECE_DROP_TILT = 0.2;

/** From a slot's top to the shelf's top edge. */
const SHELF_Y = SLOT_H + PAD_BOTTOM + SHELF_GAP;

/**
 * How far a fallen letter drops, from the bottom of its ink (y down, from
 * the baseline) to its rest on the shelf.
 */
export function dropFor(inkBottom: number): number {
  return SHELF_Y - (BASELINE + inkBottom) + DROP_REST;
}

/**
 * How far a broken-off piece drops, as in the prototype: to the shelf from
 * the letter's ink bottom, plus a share of the piece's height above its
 * centroid (the piece tumbles about its centroid).
 */
export function pieceDropFor(inkBottom: number, centroidY: number): number {
  return SHELF_Y - (BASELINE + inkBottom) + (inkBottom - centroidY) * PIECE_DROP_TILT;
}

const side = (i: number) => (i % 2 ? 1 : -1);

/** Deterministic horizontal drift of a fallen letter in slot `i`. */
export function fallX(i: number): number {
  return side(i) * (0.04 + ((i * 37) % 10) / 70);
}

/** Deterministic tilt of a fallen letter in slot `i`, degrees. */
export function fallRotation(i: number): number {
  return side(i) * (6 + ((i * 53) % 12));
}

/** Deterministic horizontal drift of a piece broken off the letter in slot `i`. */
export function pieceFallX(i: number): number {
  return side(i) * (0.06 + (i % 3) * 0.05);
}

/** Deterministic tumble of a piece broken off the letter in slot `i`, degrees. */
export function pieceFallRotation(i: number): number {
  return side(i) * (25 + ((i * 17) % 40));
}
