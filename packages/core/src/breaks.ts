/**
 * Letter breaks: which letter turns into which when a piece chips off
 * (docs/tactics/10-otval-katalog.md). Pure data and logic, no geometry —
 * the piece shapes live in `@beda/transom` (`pieces.ts`), keyed by the same
 * `BreakKey`, so a key without a shape is a compile error there.
 *
 * M>N is deliberately absent: in Playfair Display Black the remainder does
 * not read as N.
 */
export const BREAKS = [
  // Latin
  'R>P',
  'B>P',
  'G>C',
  'O>C',
  'E>L',
  'E>F',
  'W>V',
  // Cyrillic
  'Т>Г',
  'Д>Л',
  'Ё>Е',
  'Й>И',
  'Б>Ь',
  'Б>Г',
  'В>Р',
  'П>Г',
  'Щ>Ш',
  'Ы>Ь',
  'Ж>К',
  'О>С',
] as const;

export type BreakKey = (typeof BREAKS)[number];

const KEYS: ReadonlySet<string> = new Set(BREAKS);

export function isBreakKey(key: string): key is BreakKey {
  return KEYS.has(key);
}

/** The letter that breaks: `breakFrom('Д>Л')` is `Д`. */
export function breakFrom(key: BreakKey): string {
  return key.split('>')[0] ?? '';
}

/** The letter that remains: `breakTo('Д>Л')` is `Л`. */
export function breakTo(key: BreakKey): string {
  return key.split('>')[1] ?? '';
}

const BY_CHAR = new Map<string, BreakKey[]>();
for (const key of BREAKS) {
  const from = breakFrom(key);
  BY_CHAR.set(from, [...(BY_CHAR.get(from) ?? []), key]);
}

/** Every break a character can take, in table order (Б has two). */
export function breaksFor(char: string): readonly BreakKey[] {
  return BY_CHAR.get(char) ?? [];
}

/**
 * What happens to the character at index `i` (a code point index, as
 * `Array.from(text)`): it falls off whole, or a piece breaks off it.
 */
export type Op = { i: number; fall: true } | { i: number; brk: BreakKey };

/**
 * The text left on the board after the ops: fallen letters vanish, broken
 * ones become `breakTo(key)`, and spaces collapse (no leading, trailing or
 * double spaces) as in the prototype's verifier.
 */
export function applyOps(text: string, ops: readonly Op[]): string {
  const at = new Map(ops.map((op) => [op.i, op]));
  const out = Array.from(text).map((ch, i) => {
    const op = at.get(i);
    if (!op) return ch;
    return 'fall' in op ? '' : breakTo(op.brk);
  });
  return out.join('').split(/\s+/u).filter(Boolean).join(' ');
}

/**
 * Problems with the ops for this text, empty when they are valid: an index
 * out of range, on a space, used twice, or a break whose letter isn't there.
 */
export function validateOps(text: string, ops: readonly Op[]): string[] {
  const chars = Array.from(text);
  const seen = new Set<number>();
  const errors: string[] = [];
  for (const op of ops) {
    const ch = chars[op.i];
    if (!Number.isInteger(op.i) || ch === undefined) {
      errors.push(`index ${op.i} is out of range`);
      continue;
    }
    if (seen.has(op.i)) errors.push(`index ${op.i} is used twice`);
    seen.add(op.i);
    if (/\s/u.test(ch)) errors.push(`index ${op.i} is a space`);
    if ('brk' in op) {
      if (!isBreakKey(op.brk)) errors.push(`unknown break ${op.brk}`);
      else if (breakFrom(op.brk) !== ch)
        errors.push(`index ${op.i} is ${ch}, not ${breakFrom(op.brk)}`);
    }
  }
  return errors;
}
