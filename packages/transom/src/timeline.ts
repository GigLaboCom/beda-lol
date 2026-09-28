/**
 * The animation timeline, in milliseconds at normal speed
 * (docs/09-transom-falls-component.md §4). Everything scales with `--k`
 * (1 normal, 2.5 slow). The controller schedules from these numbers and the
 * CSS durations are generated from them (S08c), so the two can't drift.
 */
export const TIMELINE = {
  /** Before the first op starts. */
  lead: 150,
  /** Between the starts of two ops. */
  opGap: 520,
  /** A falling letter: nails 3, 2, 1 pop at these offsets… */
  nailPops: [0, 120, 240],
  /** …each popping (drop and fade) this long. */
  nailPop: 550,
  /** Then it hangs on nail 0 and swings to its hang angle. */
  hangAt: 420,
  swing: 2600,
  /** Then the last nail pops and it drops to the shelf. */
  fallAt: 420 + 2600,
  fall: 750,
  /** A break: the piece shudders… */
  crack: 450,
  /** …then falls to the shelf with a tumble. */
  pieceDropAt: 470,
  pieceDrop: 800,
} as const;

/**
 * The damped swing into the hang angle: keyframe offsets (fractions of the
 * swing) and the angle at each, as a factor of the hang angle.
 */
export const SWING_KEYFRAMES: readonly (readonly [offset: number, factor: number])[] = [
  [0, 0],
  [0.16, 1.42],
  [0.34, 0.7],
  [0.52, 1.2],
  [0.7, 0.88],
  [0.86, 1.05],
  [1, 1],
];

/** When the last visible change of one op ends, from the op's start. */
export function opDuration(kind: 'fall' | 'brk'): number {
  return kind === 'fall'
    ? TIMELINE.fallAt + TIMELINE.fall
    : TIMELINE.pieceDropAt + TIMELINE.pieceDrop;
}
