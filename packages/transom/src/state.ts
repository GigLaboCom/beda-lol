/** Slot state from its nail count: ≥2 on the board, 1 hanging, 0 fallen. */
export type SlotState = 'on' | 'hang' | 'fall';

export function slotState(nails: number): SlotState {
  return nails <= 0 ? 'fall' : nails === 1 ? 'hang' : 'on';
}

/** «Надпись на транце: пусто пусто БЕДА» — what a screen reader hears. */
export function transomLabel(letters: readonly string[], nails: readonly number[]): string {
  // Runs of letters still on the board read as words; every fallen letter is «пусто».
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
      parts.push('пусто');
    }
  });
  flush();
  return `Надпись на транце: ${parts.join(' ')}`;
}
