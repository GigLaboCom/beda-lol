/** «Как назовёшь»: which letters fall off or break on a project name, and what is left. */
import { applyOps, breaksFor, breakTo, type Op } from './breaks';
import { canFall, type NormalizedName, normalizeName } from './charset';
import { DEFAULT_LOCALE, type Locale } from './locale';

export const MAX_NAME_LENGTH = 14;

/**
 * Funny words the remaining letters may spell. Russian from the prototype
 * plus the catalogue's failure words that breaks make reachable.
 */
export const FUNNY_RU: readonly string[] = [
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
  'лёг',
  'туман',
  'пыль',
  'ох',
  'ой',
  'дохлый',
];

/**
 * English words, for names typed in Latin letters. [HUMAN] review (D7). A
 * phrase matches its letters in order; the space is not a letter.
 */
export const FUNNY_EN: readonly string[] = [
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
  'cold',
  'pest',
  'pet',
  'cost',
  'stall',
  'oof',
  'owe',
  'coal',
  'pain',
  'boring',
  'cold push',
];

/**
 * The word list for a page locale. Both languages stay reachable from either
 * page (names are often Latin on the Russian page); the page's own words come
 * first, which only matters for ties.
 */
export function getFunny(locale: Locale = DEFAULT_LOCALE): readonly string[] {
  return locale === 'en' ? [...FUNNY_EN, ...FUNNY_RU] : [...FUNNY_RU, ...FUNNY_EN];
}

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

/**
 * What goes on the board for a typed name: normalised to the board's charset
 * (`normalizeName`), then cut to {@link MAX_NAME_LENGTH} characters.
 */
export function prepareName(raw: string): NormalizedName {
  const { name, removed } = normalizeName(raw);
  return { name: Array.from(name).slice(0, MAX_NAME_LENGTH).join('').trim(), removed };
}

export function hasStopWord(s: string): boolean {
  const low = s.toLowerCase();
  return STOP.some((w) => low.includes(w));
}

export interface NamerResult {
  /** What happens on the board, in slot order (code point indexes of the name). */
  ops: Op[];
  /** What is left: the funny word (lower case) or the fallback remainder. */
  word: string;
  /** A funny word was found. */
  found: boolean;
}

interface Plan {
  breaks: number;
  ops: Op[];
}

/** Fewer breaks first (whole-letter drops read first), then the earliest ops. */
function better(a: Plan, b: Plan): boolean {
  if (a.breaks !== b.breaks) return a.breaks < b.breaks;
  for (let k = 0; k < Math.min(a.ops.length, b.ops.length); k++) {
    const x = (a.ops[k] as Op).i;
    const y = (b.ops[k] as Op).i;
    if (x !== y) return x < y;
  }
  return a.ops.length < b.ops.length;
}

/**
 * The best way to spell `word` from `chars`: each letter or digit is kept,
 * dropped, or broken into another letter; everything else stays on the board
 * and is skipped. Dynamic programming over (position, letters matched).
 */
function planFor(chars: readonly string[], word: readonly string[]): Plan | null {
  const n = chars.length;
  const memo = new Map<number, Plan | null>();
  const solve = (i: number, j: number): Plan | null => {
    if (i === n) return j === word.length ? { breaks: 0, ops: [] } : null;
    const key = i * 64 + j;
    if (memo.has(key)) return memo.get(key) ?? null;
    const ch = chars[i] as string;
    let best: Plan | null = null;
    const offer = (p: Plan | null) => {
      if (p && (!best || better(p, best))) best = p;
    };
    if (!canFall(ch)) {
      offer(solve(i + 1, j));
    } else {
      const want = word[j];
      if (want !== undefined && ch.toLowerCase() === want) offer(solve(i + 1, j + 1));
      if (want !== undefined) {
        for (const brk of breaksFor(ch)) {
          if (breakTo(brk).toLowerCase() !== want) continue;
          const rest = solve(i + 1, j + 1);
          if (rest) offer({ breaks: rest.breaks + 1, ops: [{ i, brk }, ...rest.ops] });
        }
      }
      const rest = solve(i + 1, j);
      if (rest) offer({ breaks: rest.breaks, ops: [{ i, fall: true }, ...rest.ops] });
    }
    memo.set(key, best);
    return best;
  };
  return solve(0, 0);
}

/**
 * Finds the funny word the name turns into when letters fall off or break
 * (at least one op). Ranking, deterministic: the longest word, then fewer
 * ops, then fewer breaks, then the earliest ops, then list order. A result
 * whose board would show a stop word is skipped. Fallback: the first two
 * letters fall (one for names of ≤ 3 letters); if the remainder hits the
 * stop list, only the first letter falls.
 */
export function findOps(name: string, locale: Locale = DEFAULT_LOCALE): NamerResult {
  const chars = Array.from(name);
  let best: { len: number; word: string; plan: Plan } | null = null;
  for (const w of getFunny(locale)) {
    const letters = Array.from(w.replace(/ /g, ''));
    if (best && letters.length < best.len) continue;
    const plan = planFor(chars, letters);
    if (!plan || plan.ops.length === 0) continue;
    if (hasStopWord(applyOps(name, plan.ops))) continue;
    const beats =
      !best ||
      letters.length > best.len ||
      (letters.length === best.len &&
        (plan.ops.length < best.plan.ops.length ||
          (plan.ops.length === best.plan.ops.length && better(plan, best.plan))));
    if (beats) best = { len: letters.length, word: w, plan };
  }
  if (best) return { ops: best.plan.ops, word: best.word, found: true };

  const idx = chars.flatMap((c, i) => (canFall(c) ? [i] : []));
  const falls = (k: number): Op[] => idx.slice(0, k).map((i) => ({ i, fall: true }));
  let ops = falls(idx.length > 3 ? 2 : 1);
  if (hasStopWord(applyOps(name, ops))) ops = falls(1);
  return { ops, word: applyOps(name, ops), found: false };
}

const RU_NUMBER = ['', 'одной', 'двух', 'трёх'];

function ruPlural(k: number, one: string, few: string, many: string): string {
  const mod10 = k % 10;
  const mod100 = k % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * What happened on the board: «2 буквы отвалились, у одной откололся кусок» /
 * “2 letters fell off, one lost a piece”.
 */
export function opsSummary(ops: readonly Op[], locale: Locale = DEFAULT_LOCALE): string {
  const falls = ops.filter((o) => 'fall' in o).length;
  const breaks = ops.length - falls;
  if (locale === 'en') {
    const f = falls === 1 ? 'One letter fell off' : `${falls} letters fell off`;
    if (!breaks) return f;
    if (!falls) return breaks === 1 ? 'One letter lost a piece' : `${breaks} letters lost a piece`;
    return `${f}, ${breaks === 1 ? 'one' : breaks} lost a piece`;
  }
  const f =
    falls === 1
      ? 'Одна буква отвалилась'
      : `${falls} ${ruPlural(falls, 'буква', 'буквы', 'букв')} ${ruPlural(falls, 'отвалилась', 'отвалились', 'отвалились')}`;
  const who = RU_NUMBER[breaks] ?? String(breaks);
  const piece = breaks === 1 ? 'откололся кусок' : 'откололись куски';
  if (!breaks) return f;
  if (!falls) return `У ${who} ${breaks === 1 ? 'буквы' : 'букв'} ${piece}`;
  return `${f}, у ${who} ${piece}`;
}

export interface Verdict {
  was: string;
  now: string;
  text: string;
}

/** The verdict lines under the transom. `typed` is the name as the visitor typed it. */
export function verdict(
  typed: string,
  result: NamerResult,
  locale: Locale = DEFAULT_LOCALE,
): Verdict {
  const word = result.word.toUpperCase();
  if (locale === 'en') {
    return {
      was: `Before: ${typed}`,
      now: `After: ${word || '…'}`,
      text: result.found
        ? `${opsSummary(result.ops, 'en')} — and the vessel is already called “${word}”. Marketing holds on less than it seems.`
        : 'No word came together, but the leftover still reads like a diagnosis. The classic pet-project path: the start falls off first.',
    };
  }
  return {
    was: `Было: ${typed}`,
    now: `Стало: ${word || '…'}`,
    text: result.found
      ? `${opsSummary(result.ops)} — и судно уже называется «${word}». Маркетинг держится на меньшем, чем кажется.`
      : 'Слово не сложилось, но остаток всё равно звучит как диагноз. Классический путь пет-проекта: сначала отваливается начало.',
  };
}
