/**
 * Where each letter is nailed: points in `em` from the slot's top-left corner.
 * Index 0 is the hinge — it holds longest and is the rotation origin.
 * `hang` is the CSS rotation (degrees, clockwise) of a letter hanging on its hinge.
 * Hand-tuned for Playfair Display Black; shared by the 2D board and, later, 3D.
 */

export type Point = readonly [x: number, y: number];

export interface Mount {
  pts: readonly [Point, Point, Point, Point];
  hang: number;
}

export const MOUNTS: Readonly<Record<string, Mount>> = {
  П: {
    pts: [
      [0.1, 0.28],
      [0.6, 0.28],
      [0.1, 0.86],
      [0.6, 0.86],
    ],
    hang: 37,
  },
  // О topples clockwise ~124° around its lower-left rivet (docs/02-letter-animation.md §7).
  О: {
    pts: [
      [0.09, 0.72],
      [0.09, 0.46],
      [0.64, 0.46],
      [0.64, 0.72],
    ],
    hang: 124,
  },
  Б: {
    pts: [
      [0.1, 0.28],
      [0.55, 0.28],
      [0.1, 0.86],
      [0.5, 0.86],
    ],
    hang: 34,
  },
  Е: {
    pts: [
      [0.1, 0.28],
      [0.54, 0.28],
      [0.1, 0.86],
      [0.54, 0.86],
    ],
    hang: 36,
  },
  Д: {
    pts: [
      [0.14, 0.28],
      [0.58, 0.28],
      [0.05, 0.93],
      [0.66, 0.93],
    ],
    hang: 30,
  },
  А: {
    pts: [
      [0.36, 0.31],
      [0.08, 0.88],
      [0.64, 0.88],
      [0.36, 0.7],
    ],
    hang: 6,
  },
};

export const DEFAULT_MOUNT: Mount = {
  pts: [
    [0.1, 0.28],
    [0.6, 0.28],
    [0.1, 0.86],
    [0.6, 0.86],
  ],
  hang: 34,
};

export function mountFor(letter: string): Mount {
  return MOUNTS[letter] ?? DEFAULT_MOUNT;
}

/** Deterministic horizontal drift of a fallen letter, in em (as in the prototype). */
export function fallX(i: number): number {
  return (i % 2 ? 1 : -1) * (0.04 + ((i * 37) % 10) / 70);
}

/** Deterministic tilt of a fallen letter, in degrees (as in the prototype). */
export function fallRotation(i: number): number {
  return (i % 2 ? 1 : -1) * (6 + ((i * 53) % 12));
}
