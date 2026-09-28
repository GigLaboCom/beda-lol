import { type Letter, letterIndex, WORD } from './letters';
import { DEFAULT_LOCALE, type Locale } from './locale';

/** «Да» = 1, «Частично» = 0.5, «Нет» = 0. */
export type Answer = 0 | 0.5 | 1;

export interface Question {
  letter: Letter;
  text: string;
  hint: string;
}

/** Twelve questions, two per letter, in word order. Russian product copy from the prototype. */
export const QUESTIONS_RU: readonly Question[] = [
  {
    letter: 'П',
    text: 'Можешь одной фразой сказать, для кого твой проект?',
    hint: 'Не «для всех, кому удобно», а конкретные люди с конкретной задачей.',
  },
  {
    letter: 'П',
    text: 'Знаешь, чем он лучше того, чем люди пользуются сейчас?',
    hint: '«Сейчас» — это часто таблица, чат или вообще ничего.',
  },
  {
    letter: 'О',
    text: 'Говорил за последний месяц хотя бы с пятью потенциальными пользователями?',
    hint: 'Друзья, коллеги и мама не считаются.',
  },
  {
    letter: 'О',
    text: 'Кто-то, кроме друзей, пользовался проектом и дал обратную связь?',
    hint: 'Хоть один незнакомый человек.',
  },
  {
    letter: 'Б',
    text: 'Есть что-то бесплатное, что приводит людей само — статья, инструмент, шаблон?',
    hint: 'Что-то, что находят без тебя.',
  },
  {
    letter: 'Б',
    text: 'Писал о проекте или его теме хоть раз за последний месяц?',
    hint: 'Коммит-сообщения не считаются.',
  },
  {
    letter: 'Е',
    text: 'Есть страница, где за десять секунд понятно, что это?',
    hint: 'README на GitHub — считается, если его поймёт не-разработчик.',
  },
  {
    letter: 'Е',
    text: 'Можно ли на этой странице оставить почту или начать пользоваться?',
    hint: 'Одна кнопка — уже да.',
  },
  {
    letter: 'Д',
    text: 'Есть канал, куда ты регулярно выходишь с проектом?',
    hint: 'Регулярно — это чаще раза в месяц.',
  },
  {
    letter: 'Д',
    text: 'Знаешь, где конкретно собирается твоя аудитория?',
    hint: 'Название чата, сообщества, рассылки.',
  },
  {
    letter: 'А',
    text: 'Знаешь, сколько людей пришло за последнюю неделю?',
    hint: 'Хотя бы порядок числа.',
  },
  { letter: 'А', text: 'Знаешь, откуда они пришли?', hint: 'Хотя бы один источник.' },
];

/** The same twelve questions in English, in the same order (letters unchanged). */
export const QUESTIONS_EN: readonly Question[] = [
  {
    letter: 'П',
    text: 'Can you say in one phrase who your project is for?',
    hint: 'Not “everyone who finds it handy” — specific people with a specific job.',
  },
  {
    letter: 'П',
    text: 'Do you know why it beats what people use now?',
    hint: '“Now” is often a spreadsheet, a chat, or nothing at all.',
  },
  {
    letter: 'О',
    text: 'In the last month, did you talk to at least five potential users?',
    hint: 'Friends, colleagues and your mum don’t count.',
  },
  {
    letter: 'О',
    text: 'Has anyone besides friends used it and given feedback?',
    hint: 'Even one stranger counts.',
  },
  {
    letter: 'Б',
    text: 'Is there something free that brings people in on its own — an article, tool, template?',
    hint: 'Something people find without you.',
  },
  {
    letter: 'Б',
    text: 'Have you written about the project or its topic at least once this month?',
    hint: 'Commit messages don’t count.',
  },
  {
    letter: 'Е',
    text: 'Is there a page where ten seconds is enough to get what it is?',
    hint: 'A GitHub README counts if a non-developer would get it.',
  },
  {
    letter: 'Е',
    text: 'Can people leave an email or start using it right on that page?',
    hint: 'One button already means yes.',
  },
  {
    letter: 'Д',
    text: 'Is there a channel you show up in with the project regularly?',
    hint: 'Regularly means more often than once a month.',
  },
  {
    letter: 'Д',
    text: 'Do you know exactly where your audience gathers?',
    hint: 'The name of the chat, community or newsletter.',
  },
  {
    letter: 'А',
    text: 'Do you know how many people came in the last week?',
    hint: 'A ballpark figure is enough.',
  },
  { letter: 'А', text: 'Do you know where they came from?', hint: 'At least one source.' },
];

export const QUESTIONS_BY_LOCALE: Record<Locale, readonly Question[]> = {
  ru: QUESTIONS_RU,
  en: QUESTIONS_EN,
};

/** Russian questions, kept as the default export for backward compatibility. */
export const QUESTIONS = QUESTIONS_RU;

/** The twelve questions for a locale (defaults to Russian). */
export function getQuestions(locale: Locale = DEFAULT_LOCALE): readonly Question[] {
  return QUESTIONS_BY_LOCALE[locale] ?? QUESTIONS_RU;
}

export const QUESTION_COUNT = QUESTIONS.length;

/** Nails per letter: 0 = fallen, 1 = hanging, 2–4 = on the board. */
export type Nails = number[];

export const ALL_NAILED: Nails = [4, 4, 4, 4, 4, 4];

/**
 * Nails while the quiz is running: every «нет» knocks out two nails of its
 * letter, every «частично» one. Question letters are the same in every locale,
 * so scoring is locale-independent.
 */
export function liveNails(answers: readonly Answer[]): Nails {
  const pops = [0, 0, 0, 0, 0, 0];
  answers.forEach((a, qi) => {
    const q = QUESTIONS[qi];
    if (!q) return;
    const li = letterIndex(q.letter);
    pops[li] = (pops[li] ?? 0) + (a === 0 ? 2 : a === 0.5 ? 1 : 0);
  });
  return pops.map((p) => Math.max(0, 4 - p));
}

/** Per-letter score 0..2 (sum of the two answers). */
export function scores(answers: readonly Answer[]): number[] {
  const s = [0, 0, 0, 0, 0, 0];
  answers.forEach((a, qi) => {
    const q = QUESTIONS[qi];
    if (!q) return;
    const li = letterIndex(q.letter);
    s[li] = (s[li] ?? 0) + a;
  });
  return s;
}

/** Final nails from scores: 2 → 4, 1.5 → 3, 0.5–1 → 1 (hanging), 0 → 0 (fallen). */
export function finalNails(letterScores: readonly number[]): Nails {
  return letterScores.map((v) => (v >= 2 ? 4 : v >= 1.5 ? 3 : v >= 0.5 ? 1 : 0));
}

export type ClassId = 'flagship' | 'schooner' | 'beda' | 'slipway' | 'beda-po';

export interface ShipClass {
  id: ClassId;
  title: string;
  text: string;
}

export const CLASSES_RU: Record<ClassId, ShipClass> = {
  'beda-po': {
    id: 'beda-po',
    title: 'Классическая «Беда»',
    text: 'Отвалились ровно П и О — позиционирование и разговоры с людьми. ПО осталось у тебя в репозитории. Победы пока нет.',
  },
  flagship: {
    id: 'flagship',
    title: 'Флагман',
    text: 'Редкость. Все шесть букв на месте — покажи остальным, как это делается.',
  },
  schooner: {
    id: 'schooner',
    title: 'Шхуна на ходу',
    text: 'Одна-две клёпки — и выходишь в море.',
  },
  beda: { id: 'beda', title: 'Классическая «Беда»', text: 'ПО есть. Победы нет. Узнаёшь?' },
  slipway: {
    id: 'slipway',
    title: 'Корпус на стапеле',
    text: 'Проект есть. Судна пока нет. Хорошая новость: каждая буква прибивается за вечер.',
  },
};

export const CLASSES_EN: Record<ClassId, ShipClass> = {
  'beda-po': {
    id: 'beda-po',
    title: 'Classic “Beda”',
    text: 'Exactly P and O fell off — positioning and talking to people. The software (PO) sits in your repo. No victory yet.',
  },
  flagship: {
    id: 'flagship',
    title: 'Flagship',
    text: 'A rarity. All six letters in place — show the rest how it’s done.',
  },
  schooner: {
    id: 'schooner',
    title: 'Schooner under way',
    text: 'A rivet or two — and you’re out to sea.',
  },
  beda: {
    id: 'beda',
    title: 'Classic “Beda”',
    text: 'You’ve got the software. No victory. Sound familiar?',
  },
  slipway: {
    id: 'slipway',
    title: 'Hull on the slipway',
    text: 'You have a project. Not yet a ship. Good news: each letter goes back in an evening.',
  },
};

export const CLASSES_BY_LOCALE: Record<Locale, Record<ClassId, ShipClass>> = {
  ru: CLASSES_RU,
  en: CLASSES_EN,
};

/** Russian ship classes, kept as the default export for backward compatibility. */
export const CLASSES = CLASSES_RU;

/** Ship class from final nails. The special П+О case is checked first, as in the prototype. */
export function classify(nails: readonly number[], locale: Locale = DEFAULT_LOCALE): ShipClass {
  const classes = CLASSES_BY_LOCALE[locale] ?? CLASSES_RU;
  const mounted = nails.filter((c) => c >= 2).length;
  const poOnly = nails[0] === 0 && nails[1] === 0 && nails.slice(2).every((c) => c >= 1);
  if (poOnly) return classes['beda-po'];
  if (mounted === 6) return classes.flagship;
  if (mounted >= 4) return classes.schooner;
  if (mounted >= 2) return classes.beda;
  return classes.slipway;
}

export interface Action {
  letter: Letter;
  /** How long it takes, e.g. «15 минут». */
  time: string;
  title: string;
  text: string;
}

/** One first action per letter, in Russian. Product copy from the prototype. */
export const ACTS_RU: Record<Letter, Omit<Action, 'letter'>> = {
  П: {
    time: '15 минут',
    title: 'Напиши одну фразу',
    text: '«Для [кого], кто [проблема], мой проект — это [что], в отличие от [альтернативы]».',
  },
  О: {
    time: '30 минут',
    title: 'Найди трёх человек',
    text: 'У кого есть эта проблема. Спроси, как они решают её сейчас. Ничего не продавай.',
  },
  Б: {
    time: '1 час',
    title: 'Напиши один пост',
    text: 'О самой полезной вещи, которую узнал, пока делал проект.',
  },
  Е: { time: '1 час', title: 'Сделай страницу из трёх блоков', text: 'Что это, для кого, кнопка.' },
  Д: {
    time: '10 минут',
    title: 'Выбери один канал',
    text: 'И поставь в календарь выход туда раз в неделю. Один — не пять.',
  },
  А: {
    time: '20 минут',
    title: 'Поставь счётчик',
    text: 'Любой простой аналитики хватит. Посмотри цифры через неделю.',
  },
};

/** One first action per letter, in English. */
export const ACTS_EN: Record<Letter, Omit<Action, 'letter'>> = {
  П: {
    time: '15 min',
    title: 'Write one sentence',
    text: 'For [who] who [problem], my project is [what], unlike [alternative].',
  },
  О: {
    time: '30 min',
    title: 'Find three people',
    text: 'Who have this problem. Ask how they solve it now. Sell nothing.',
  },
  Б: {
    time: '1 hour',
    title: 'Write one post',
    text: 'About the single most useful thing you learned building the project.',
  },
  Е: {
    time: '1 hour',
    title: 'Make a three-block page',
    text: 'What it is, who it’s for, a button.',
  },
  Д: {
    time: '10 min',
    title: 'Pick one channel',
    text: 'And put a weekly appearance there in your calendar. One — not five.',
  },
  А: {
    time: '20 min',
    title: 'Add a counter',
    text: 'Any simple analytics will do. Check the numbers in a week.',
  },
};

export const ACTS_BY_LOCALE: Record<Locale, Record<Letter, Omit<Action, 'letter'>>> = {
  ru: ACTS_RU,
  en: ACTS_EN,
};

/** Russian actions, kept as the default export for backward compatibility. */
export const ACTS = ACTS_RU;

const FALLBACK_ACTIONS: readonly Letter[] = ['О', 'Д', 'Б'];

/** Up to three actions for the weakest letters (score < 2); fallback О, Д, Б. */
export function pickActions(
  letterScores: readonly number[],
  locale: Locale = DEFAULT_LOCALE,
): Action[] {
  const acts = ACTS_BY_LOCALE[locale] ?? ACTS_RU;
  const weakest = WORD.map((letter, i) => ({ letter, s: letterScores[i] ?? 0 }))
    .filter((x) => x.s < 2)
    .sort((a, b) => a.s - b.s)
    .slice(0, 3)
    .map((x) => x.letter);
  const letters = weakest.length ? weakest : FALLBACK_ACTIONS;
  return letters.map((letter) => ({ letter, ...acts[letter] }));
}

/**
 * Scores approximated from a result code (shared links carry states only):
 * fallen 0, hanging 1, on the board 2. Used to pick actions on result pages.
 */
export function scoresFromStates(states: readonly number[]): number[] {
  return states.map((s) => (s >= 2 ? 2 : s === 1 ? 1 : 0));
}
