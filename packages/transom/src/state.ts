/** Slot state from its nail count: ≥2 on the board, 1 hanging, 0 fallen. */
export type SlotState = 'on' | 'hang' | 'fall';

export function slotState(nails: number): SlotState {
  return nails <= 0 ? 'fall' : nails === 1 ? 'hang' : 'on';
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
 * letters still on the board read as words; every fallen letter is «пусто».
 */
export function transomLabel(
  letters: readonly string[],
  nails: readonly number[],
  text: TransomLabelText = {},
): string {
  const prefix = text.prefix ?? RU_LABEL_TEXT.prefix;
  const empty = text.empty ?? RU_LABEL_TEXT.empty;
  const parts: string[] = [];
  let run = '';
  const flush = () => {
    if (run) parts.push(run);
    run = '';
  };
  letters.forEach((ch, i) => {
    if (ch === ' ') flush();
    else if ((nails[i] ?? 0) > 0) run += ch;
    else {
      flush();
      parts.push(empty);
    }
  });
  flush();
  return `${prefix}: ${parts.join(' ')}`;
}
