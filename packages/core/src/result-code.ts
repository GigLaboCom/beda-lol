/**
 * Result code: six digits, one per letter of ПОБЕДА.
 * 0 — fell off, 1 — hanging, 2 — on the board. `/osmotr/r/002212`.
 * The Rust API validates the same format; both test suites share
 * `fixtures/result-codes.json`.
 */

export type LetterState = 0 | 1 | 2;
export type States = LetterState[];

const CODE_RE = /^[0-2]{6}$/;

/** Nails → state: ≥2 → 2, 1 → 1, 0 → 0. */
export function nailsToStates(nails: readonly number[]): States {
  return nails.map((n) => (n >= 2 ? 2 : n === 1 ? 1 : 0));
}

/** States → nails for rendering: 2 → 4, 1 → 1, 0 → 0. */
export function statesToNails(states: readonly LetterState[]): number[] {
  return states.map((s) => (s === 2 ? 4 : s));
}

export function encode(states: readonly LetterState[]): string {
  if (states.length !== 6) throw new RangeError('a result has exactly six letters');
  return states.join('');
}

/** Strict: exactly six digits 0–2, otherwise `null`. */
export function decode(code: string): States | null {
  if (!CODE_RE.test(code)) return null;
  return Array.from(code, (c) => Number(c) as LetterState);
}

export function isValidCode(code: string): boolean {
  return CODE_RE.test(code);
}

/** All 3⁶ = 729 codes, from 000000 to 222222. */
export function allCodes(): string[] {
  const codes: string[] = [];
  for (let n = 0; n < 729; n++) {
    codes.push(n.toString(3).padStart(6, '0'));
  }
  return codes;
}
