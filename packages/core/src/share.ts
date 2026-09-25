import { WORD } from './letters';
import type { LetterState } from './result-code';

/** The transom as text, fallen letters as `_`: «__БЕДА». */
export function shownWord(states: readonly LetterState[]): string {
  return WORD.map((ch, i) => ((states[i] ?? 0) > 0 ? ch : '_')).join('');
}

/** «Прошёл осмотр судна: у меня __БЕДА. А у тебя?» */
export function shareText(states: readonly LetterState[]): string {
  return `Прошёл осмотр судна: у меня ${shownWord(states)}. А у тебя?`;
}
