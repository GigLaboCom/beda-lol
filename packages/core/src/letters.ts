/** The word on the transom, in order. */
export const WORD = ['П', 'О', 'Б', 'Е', 'Д', 'А'] as const;

export type Letter = (typeof WORD)[number];

export interface Pillar {
  /** Pillar name, e.g. «Позиционирование». */
  name: string;
  /** One-line description. */
  description: string;
}

/** The six pillars of ПОБЕДА. Product copy from the prototype. */
export const PILLARS: Record<Letter, Pillar> = {
  П: {
    name: 'Позиционирование',
    description: 'Одной фразой: для кого проект и чем он лучше того, чем пользуются сейчас.',
  },
  О: {
    name: 'Общение с людьми',
    description: 'За месяц — хотя бы пять разговоров с теми, для кого ты это делаешь.',
  },
  Б: {
    name: 'Бесплатная ценность',
    description: 'Статья, инструмент или шаблон, который приводит людей сам.',
  },
  Е: {
    name: 'Единая точка входа',
    description: 'Страница, где за десять секунд понятно, что это, и можно начать.',
  },
  Д: { name: 'Дистрибуция', description: 'Канал, куда ты регулярно выходишь с проектом.' },
  А: { name: 'Аналитика', description: 'Сколько людей пришло, откуда и что они сделали.' },
};

/** Index of a letter in {@link WORD}. */
export function letterIndex(letter: Letter): number {
  return WORD.indexOf(letter);
}
