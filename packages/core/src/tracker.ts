import type { Letter } from './letters';

/** Four steps per letter: each one hammers a nail back in. Product copy from the prototype. */
export const STEPS: Record<Letter, readonly [string, string, string, string]> = {
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

export type NailStateId = 'nailed' | 'holding' | 'hanging' | 'fallen';

export interface NailState {
  id: NailStateId;
  /** Status label on the tracker card. */
  label: string;
  /** Card description. */
  text: string;
}

/** Tracker card state for 0..4 nails. */
export function nailState(count: number): NailState {
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
