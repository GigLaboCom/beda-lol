/** «Как назовёшь»: which letters fall off a project name, and what is left. */

export const MAX_NAME_LENGTH = 14;

/** Funny words the remaining letters may spell. Product copy from the prototype. */
export const FUNNY: readonly string[] = [
  'беда',
  'бед',
  'дыра',
  'течь',
  'мель',
  'рифы',
  'риф',
  'крах',
  'баг',
  'баги',
  'лень',
  'ноль',
  'ад',
  'яд',
  'тлен',
  'хлам',
  'мрак',
  'дно',
  'вред',
  'бред',
  'брод',
  'рок',
  'сон',
  'мука',
  'тоска',
  'пена',
  'шум',
  'бег',
  'крен',
  'трюм',
  'шторм',
  'лом',
  'облом',
  'отказ',
  'фейл',
  'пшик',
  'bug',
  'bugs',
  'dead',
  'sad',
  'fail',
  'oops',
  'lag',
  'mess',
  'lost',
  'nope',
  'doom',
  'bad',
  'sink',
  'leak',
  'zero',
  'null',
  'void',
  'rip',
];

/** Substrings the fallback remainder must not contain. */
export const STOP: readonly string[] = [
  'хуй',
  'хуе',
  'хуё',
  'пизд',
  'бля',
  'еба',
  'ёба',
  'ебл',
  'сук',
  'муд',
  'залуп',
  'fuck',
  'shit',
  'cunt',
  'dick',
];

/** Collapses whitespace, trims, upper-cases, cuts to 14 characters. */
export function normalizeName(input: string): string {
  const collapsed = input.replace(/\s+/g, ' ').trim().toUpperCase();
  return Array.from(collapsed).slice(0, MAX_NAME_LENGTH).join('').trim();
}

export function hasStopWord(s: string): boolean {
  const low = s.toLowerCase();
  return STOP.some((w) => low.includes(w));
}

export interface Removal {
  /** Indexes (in `Array.from(name)`) of letters that fall off. */
  removed: number[];
  /** What is left: the funny word (lower case) or the fallback remainder. */
  word: string;
  /** A funny word was found. */
  found: boolean;
}

/**
 * Finds the longest funny word that the name spells as a subsequence once
 * some letters fall off (at least one must fall). Fallback: the first two
 * letters fall (one for names of ≤ 3 letters); if the remainder hits the
 * stop list, only the first letter falls.
 */
export function findRemoval(name: string): Removal {
  const chars = Array.from(name);
  const low = chars.map((c) => c.toLowerCase());
  const idx: number[] = [];
  chars.forEach((c, i) => {
    if (c !== ' ') idx.push(i);
  });

  let best: { len: number; word: string; keep: number[] } | null = null;
  for (const w of FUNNY) {
    const wc = Array.from(w);
    const keep: number[] = [];
    let j = 0;
    for (let k = 0; k < idx.length && j < wc.length; k++) {
      const at = idx[k] as number;
      if (low[at] === wc[j]) {
        keep.push(at);
        j++;
      }
    }
    if (j < wc.length || keep.length === idx.length) continue;
    if (!best || wc.length > best.len) best = { len: wc.length, word: w, keep };
  }
  if (best) {
    const keep = new Set(best.keep);
    return { removed: idx.filter((i) => !keep.has(i)), word: best.word, found: true };
  }

  const rest = (removed: number[]) =>
    chars
      .filter((_, i) => !removed.includes(i))
      .join('')
      .trim();
  let removed = idx.slice(0, idx.length > 3 ? 2 : 1);
  let word = rest(removed);
  if (hasStopWord(word)) {
    removed = idx.slice(0, 1);
    word = rest(removed);
  }
  return { removed, word, found: false };
}

/** «Одна отвалившаяся буква», «2 отвалившиеся буквы», «5 отвалившихся букв». */
export function fallenLetters(k: number): string {
  if (k === 1) return 'Одна отвалившаяся буква';
  const mod10 = k % 10;
  const mod100 = k % 100;
  if (mod10 === 1 && mod100 !== 11) return `${k} отвалившаяся буква`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${k} отвалившиеся буквы`;
  return `${k} отвалившихся букв`;
}

export interface Verdict {
  was: string;
  now: string;
  text: string;
}

/** The verdict lines under the transom. `typed` is the name as the visitor typed it. */
export function verdict(typed: string, result: Removal): Verdict {
  const word = result.word.toUpperCase();
  return {
    was: `Было: ${typed}`,
    now: `Стало: ${word || '…'}`,
    text: result.found
      ? `${fallenLetters(result.removed.length)} — и судно уже называется «${word}». Маркетинг держится на меньшем, чем кажется.`
      : 'Слово не сложилось, но остаток всё равно звучит как диагноз. Классический путь пет-проекта: сначала отваливается начало.',
  };
}
