/**
 * What a name typed by a visitor becomes on the board (decision D6): only
 * characters the transom font can draw (`BOARD_CHARSET`, generated from the
 * font), look-alikes collapsed to one glyph, the rest removed and reported.
 */
import { BOARD_CHARSET, FALLING } from './charset.gen';

/**
 * Look-alikes, canonical glyph → the characters that collapse to it, so a
 * name always looks the same on the board (even when both are drawable).
 * Letters of other Cyrillic alphabets become the Russian letter without the
 * extra stroke or tail.
 */
export const LOOKALIKE: Readonly<Record<string, string>> = {
  "'": '‘’‚‛′`´ʻʼ',
  '"': '“”„‟″˝',
  '«': '‹',
  '»': '›',
  '-': '‐‑‒−⁃',
  '—': '–―',
  К: 'ҚҜҠҞӃ',
  Г: 'ҒӶҔӺ',
  Н: 'ҢҤӇӉ',
  О: 'ӨӦ',
  У: 'ҮӮӰӲ',
  Х: 'ҲӼӾ',
  Ж: 'ҖӜ',
  З: 'ҘӞ',
  С: 'Ҫ',
  Ч: 'ҶҸӴ',
  Э: 'Ӭ',
  // Same shape: the Latin schwa is in the font.
  Ə: 'ӘӚ',
  Ь: 'Ҍ',
  Р: 'Ҏ',
  И: 'ӢӤ',
  А: 'ӐӒ',
  Е: 'Ӗ',
};

const MAP = new Map(
  Object.entries(LOOKALIKE).flatMap(([to, from]) => Array.from(from).map((f) => [f, to] as const)),
);
const DRAWABLE: ReadonlySet<string> = new Set(Array.from(BOARD_CHARSET));
const FALLS: ReadonlySet<string> = new Set(Array.from(FALLING));

const escapeClass = (c: string) => c.replace(/[\\\]^-]/g, '\\$&');
/** Everything the board cannot draw, as one regexp built from the charset (never by hand). */
const NOT_DRAWABLE = new RegExp(`[^ ${Array.from(DRAWABLE).map(escapeClass).join('')}]`, 'gu');

/** Whether the character can fall off or break (letters and digits); the rest stay nailed. */
export function canFall(ch: string): boolean {
  return FALLS.has(ch);
}

export interface NormalizedName {
  /** What goes on the board. */
  name: string;
  /** Characters that were dropped because the board can't draw them, once each. */
  removed: string[];
}

/**
 * NFKC → upper case → one space per whitespace run → look-alikes → for a
 * character still missing, its base without combining marks (Ệ → E) → drop
 * whatever is left outside the charset.
 */
export function normalizeName(raw: string): NormalizedName {
  const upper = raw.normalize('NFKC').toUpperCase().replace(/\s+/gu, ' ');
  const mapped = Array.from(upper)
    .map((c) => MAP.get(c) ?? c)
    .map((c) => {
      if (c === ' ' || DRAWABLE.has(c)) return c;
      const base = c.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
      return base && Array.from(base).every((b) => DRAWABLE.has(b)) ? base : c;
    })
    .join('');
  const removed = [...new Set(mapped.match(NOT_DRAWABLE) ?? [])];
  const name = mapped.replace(NOT_DRAWABLE, '').replace(/ +/g, ' ').trim();
  return { name, removed };
}
