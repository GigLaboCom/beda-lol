import { WORD } from './letters';
import { DEFAULT_LOCALE, type Locale } from './locale';
import type { LetterState } from './result-code';

/** The transom as text, fallen letters as `_`: «__БЕДА». */
export function shownWord(states: readonly LetterState[]): string {
  return WORD.map((ch, i) => ((states[i] ?? 0) > 0 ? ch : '_')).join('');
}

/** «Прошёл осмотр судна: у меня __БЕДА. А у тебя?» / English equivalent. */
export function shareText(states: readonly LetterState[], locale: Locale = DEFAULT_LOCALE): string {
  const word = shownWord(states);
  if (locale === 'en') return `Took the ship inspection: I got ${word}. And you?`;
  return `Прошёл осмотр судна: у меня ${word}. А у тебя?`;
}
