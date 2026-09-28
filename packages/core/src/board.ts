/**
 * The word on the hero transom, per locale (tactic 11: the English joke is
 * not translated but replaced with its own). Russian is ПОБЕДА → БЕДА; the
 * English board shows a pun from the catalogue, chosen here by id.
 */
import type { Op } from './breaks';
import { applyOps } from './breaks';
import { gagById } from './gags';
import { HERO_STEPS, WORD } from './letters';
import { DEFAULT_LOCALE, type Locale } from './locale';

/**
 * The catalogue gag on the `/en` hero. Provisional until D2 is decided with a
 * native-speaker check: PROOF loses its PR and says “oof”, the closest to
 * ПО + БЕДА. Changing the English board is this one line.
 */
export const EN_BOARD_GAG = 'proof';

export interface BoardWord {
  letters: readonly string[];
  /** What falls off or breaks on the hero. */
  ops: readonly Op[];
  /** What the board reads after the ops. */
  result: string;
  /**
   * The hero tells this story in nails instead of playing `ops` (Russian:
   * П hangs on its last nail, then О falls).
   */
  story?: readonly (readonly number[])[];
}

const RU_OPS: readonly Op[] = [
  { i: 0, fall: true },
  { i: 1, fall: true },
];

export function getBoardWord(locale: Locale = DEFAULT_LOCALE): BoardWord {
  if (locale === 'en') {
    const gag = gagById(EN_BOARD_GAG);
    if (!gag) throw new Error(`no gag ${EN_BOARD_GAG}`);
    return { letters: Array.from(gag.text), ops: gag.ops, result: gag.result };
  }
  return {
    letters: WORD,
    ops: RU_OPS,
    result: applyOps(WORD.join(''), RU_OPS),
    story: HERO_STEPS,
  };
}
