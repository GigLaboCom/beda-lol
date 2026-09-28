import { DEFAULT_LOCALE, type Locale } from './locale';

/** The word on the transom, in order. */
export const WORD = ['П', 'О', 'Б', 'Е', 'Д', 'А'] as const;

export type Letter = (typeof WORD)[number];

/**
 * The hero board's story, as nails per letter of {@link WORD}: П starts
 * hanging, then О falls — «ПО» lets go and «БЕДА» stays.
 */
export const HERO_STEPS: readonly (readonly number[])[] = [
  [1, 4, 4, 4, 4, 4],
  [1, 0, 4, 4, 4, 4],
];

export interface Pillar {
  /** Pillar name, e.g. «Позиционирование». */
  name: string;
  /** One-line description. */
  description: string;
}

/** The six pillars of ПОБЕДА in Russian. Product copy from the prototype. */
export const PILLARS_RU: Record<Letter, Pillar> = {
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

/** The six pillars in English. The letters keep their Cyrillic identity (П-О-Б-Е-Д-А). */
export const PILLARS_EN: Record<Letter, Pillar> = {
  П: {
    name: 'Positioning',
    description: 'In one sentence: who the project is for and why it beats what they use now.',
  },
  О: {
    name: 'Talking to people',
    description: 'At least five conversations a month with the people you build this for.',
  },
  Б: {
    name: 'Free value',
    description: 'An article, tool or template that brings people in on its own.',
  },
  Е: {
    name: 'Single entry point',
    description: 'A page where ten seconds is enough to get it and to start.',
  },
  Д: { name: 'Distribution', description: 'A channel you show up in with the project, regularly.' },
  А: { name: 'Analytics', description: 'How many people came, where from, and what they did.' },
};

export const PILLARS_BY_LOCALE: Record<Locale, Record<Letter, Pillar>> = {
  ru: PILLARS_RU,
  en: PILLARS_EN,
};

/** Russian pillars, kept as the default export for backward compatibility. */
export const PILLARS = PILLARS_RU;

/** The six pillars for a locale (defaults to Russian). */
export function getPillars(locale: Locale = DEFAULT_LOCALE): Record<Letter, Pillar> {
  return PILLARS_BY_LOCALE[locale] ?? PILLARS_RU;
}

/** Index of a letter in {@link WORD}. */
export function letterIndex(letter: Letter): number {
  return WORD.indexOf(letter);
}
