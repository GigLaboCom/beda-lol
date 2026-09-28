import { type BreakKey, breakTo, type Op } from '@beda/core';

/** One slot: how many nails still hold it (0–4) and whether its piece broke off. */
export interface SlotState {
  nails: number;
  broken: boolean;
}

/**
 * What the board shows. `breaks[i]` is the piece slot `i` *can* lose; it is
 * fixed at render time (the remainder's clip and the piece are in the markup).
 */
export interface BoardState {
  letters: readonly string[];
  slots: readonly SlotState[];
  breaks?: readonly (BreakKey | undefined)[];
}

/** How a slot looks: nailed on, hanging on its hinge, or fallen onto the shelf. */
export type SlotLook = 'on' | 'hang' | 'fall';

/** ≥ 2 nails on the board, 1 hanging, 0 fallen. */
export function slotLook(nails: number): SlotLook {
  return nails <= 0 ? 'fall' : nails === 1 ? 'hang' : 'on';
}

const clampNails = (n: number | undefined) => Math.max(0, Math.min(4, Math.round(n ?? 4)));

/** The quiz's model: nails per slot, nothing broken. Missing entries count as 4. */
export function fromNails(letters: readonly string[], nails: readonly number[] = []): BoardState {
  return {
    letters,
    slots: letters.map((_, i) => ({ nails: clampNails(nails[i]), broken: false })),
  };
}

/** The board before any op: every nail in, nothing broken, the ops' breaks ready. */
export function fromOps(text: string, ops: readonly Op[]): BoardState {
  const letters = Array.from(text);
  const breaks = letters.map((_, i) => {
    const op = ops.find((o) => o.i === i);
    return op && 'brk' in op ? op.brk : undefined;
  });
  return { ...fromNails(letters), breaks };
}

/** The board after `ops`: fallen letters have no nails, broken ones lost their piece. */
export function finalOf(state: BoardState, ops: readonly Op[]): BoardState {
  const slots = state.slots.map((s, i) => {
    const op = ops.find((o) => o.i === i);
    if (!op) return s;
    return 'fall' in op ? { ...s, nails: 0 } : { ...s, broken: true };
  });
  return { ...state, slots };
}

/** Wording for the accessible transom label, so it can read in any language. */
export interface TransomLabelText {
  /** Leading phrase, e.g. «Надпись на транце» / “Text on the transom”. */
  prefix?: string;
  /** Word read for a fallen slot, e.g. «пусто» / “empty”. */
  empty?: string;
}

/** Russian wording, the default (the transom letters themselves stay Cyrillic). */
export const RU_LABEL_TEXT: Required<TransomLabelText> = {
  prefix: 'Надпись на транце',
  empty: 'пусто',
};

/** English wording for the accessible label. */
export const EN_LABEL_TEXT: Required<TransomLabelText> = {
  prefix: 'Text on the transom',
  empty: 'empty',
};

/**
 * «Надпись на транце: пусто пусто БЕДА» — what a screen reader hears. Runs of
 * letters still on the board read as words, a broken letter reads as the
 * letter it became, and every fallen letter is «пусто».
 */
export function transomLabel(state: BoardState, text: TransomLabelText = {}): string {
  const prefix = text.prefix ?? RU_LABEL_TEXT.prefix;
  const empty = text.empty ?? RU_LABEL_TEXT.empty;
  const parts: string[] = [];
  let run = '';
  const flush = () => {
    if (run) parts.push(run);
    run = '';
  };
  state.letters.forEach((ch, i) => {
    const slot = state.slots[i];
    const key = state.breaks?.[i];
    if (ch === ' ') flush();
    else if ((slot?.nails ?? 0) > 0) run += slot?.broken && key ? breakTo(key) : ch;
    else {
      flush();
      parts.push(empty);
    }
  });
  flush();
  return `${prefix}: ${parts.join(' ')}`;
}
