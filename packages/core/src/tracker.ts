import type { Letter } from './letters';
import { DEFAULT_LOCALE, type Locale } from './locale';

/** Four steps per letter: each one hammers a nail back in. Russian copy from the prototype. */
export const STEPS_RU: Record<Letter, readonly [string, string, string, string]> = {
  П: [
    'Написать фразу позиционирования',
    'Переписать по ней заголовок страницы',
    'Показать фразу пяти людям',
    'Переписать фразу их словами',
  ],
  О: [
    'Написать одному пользователю',
    'Провести один созвон',
    'Поговорить ещё с тремя',
    'Выписать повторяющиеся проблемы',
  ],
  Б: [
    'Пост о том, чему научился',
    'Выложить полезный инструмент или шаблон',
    'Второй материал по теме',
    'Серия из пяти материалов',
  ],
  Е: [
    'Страница «что это и для кого»',
    'Кнопка «начать» или форма для почты',
    'Примеры и скриншоты на странице',
    'Первые отзывы на странице',
  ],
  Д: [
    'Выбрать один канал',
    'Первый выход в канал',
    'Три выхода за две недели',
    'Месяц регулярных выходов',
  ],
  А: [
    'Подключить счётчик',
    'Посмотреть источники за неделю',
    'Поставить одну цель',
    'Проверить цель через месяц',
  ],
};

/** The same four steps per letter in English. */
export const STEPS_EN: Record<Letter, readonly [string, string, string, string]> = {
  П: [
    'Write the positioning sentence',
    'Rewrite the page headline to match',
    'Show the sentence to five people',
    'Rewrite it in their words',
  ],
  О: ['Message one user', 'Do one call', 'Talk to three more', 'Write down the recurring problems'],
  Б: [
    'A post about what you learned',
    'Ship a useful tool or template',
    'A second piece on the topic',
    'A series of five pieces',
  ],
  Е: [
    'A “what it is and who for” page',
    'A “start” button or an email form',
    'Examples and screenshots on the page',
    'First testimonials on the page',
  ],
  Д: [
    'Pick one channel',
    'First appearance in the channel',
    'Three appearances in two weeks',
    'A month of regular appearances',
  ],
  А: [
    'Connect a counter',
    'Check the sources over a week',
    'Set one goal',
    'Check the goal in a month',
  ],
};

export const STEPS_BY_LOCALE: Record<
  Locale,
  Record<Letter, readonly [string, string, string, string]>
> = {
  ru: STEPS_RU,
  en: STEPS_EN,
};

/** Russian steps, kept as the default export for backward compatibility. */
export const STEPS = STEPS_RU;

/** The four steps per letter for a locale (defaults to Russian). */
export function getSteps(
  locale: Locale = DEFAULT_LOCALE,
): Record<Letter, readonly [string, string, string, string]> {
  return STEPS_BY_LOCALE[locale] ?? STEPS_RU;
}

export type NailStateId = 'nailed' | 'holding' | 'hanging' | 'fallen';

export interface NailState {
  id: NailStateId;
  /** Status label on the tracker card. */
  label: string;
  /** Card description. */
  text: string;
}

/** Tracker card state for 0..4 nails. */
export function nailState(count: number, locale: Locale = DEFAULT_LOCALE): NailState {
  if (locale === 'en') {
    if (count >= 4) return { id: 'nailed', label: 'nailed on', text: 'All four nails in place.' };
    if (count >= 2)
      return {
        id: 'holding',
        label: `${count} of 4`,
        text: 'Holding, but there are still empty holes.',
      };
    if (count === 1)
      return {
        id: 'hanging',
        label: 'hanging',
        text: 'Hanging by one nail. One more and the letter is back.',
      };
    return {
      id: 'fallen',
      label: 'on the shelf',
      text: 'The first nail lifts the letter off the shelf back onto the transom.',
    };
  }
  if (count >= 4) return { id: 'nailed', label: 'прибита', text: 'Все четыре гвоздя на месте.' };
  if (count >= 2)
    return { id: 'holding', label: `${count} из 4`, text: 'Держится, но гнёзда ещё есть.' };
  if (count === 1)
    return {
      id: 'hanging',
      label: 'висит',
      text: 'Висит на одном гвозде. Ещё один — и буква встанет на место.',
    };
  return {
    id: 'fallen',
    label: 'на полке',
    text: 'Первый гвоздь поднимет букву с полки обратно на транец.',
  };
}
