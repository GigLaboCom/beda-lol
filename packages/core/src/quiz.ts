import { type Letter, letterIndex, WORD } from './letters';

/** «Да» = 1, «Частично» = 0.5, «Нет» = 0. */
export type Answer = 0 | 0.5 | 1;

export interface Question {
  letter: Letter;
  text: string;
  hint: string;
}

/** Twelve questions, two per letter, in word order. Product copy from the prototype. */
export const QUESTIONS: readonly Question[] = [
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

export const QUESTION_COUNT = QUESTIONS.length;

/** Nails per letter: 0 = fallen, 1 = hanging, 2–4 = on the board. */
export type Nails = number[];

export const ALL_NAILED: Nails = [4, 4, 4, 4, 4, 4];

/**
 * Nails while the quiz is running: every «нет» knocks out two nails of its
 * letter, every «частично» one.
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

export const CLASSES: Record<ClassId, ShipClass> = {
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

/** Ship class from final nails. The special П+О case is checked first, as in the prototype. */
export function classify(nails: readonly number[]): ShipClass {
  const mounted = nails.filter((c) => c >= 2).length;
  const poOnly = nails[0] === 0 && nails[1] === 0 && nails.slice(2).every((c) => c >= 1);
  if (poOnly) return CLASSES['beda-po'];
  if (mounted === 6) return CLASSES.flagship;
  if (mounted >= 4) return CLASSES.schooner;
  if (mounted >= 2) return CLASSES.beda;
  return CLASSES.slipway;
}

export interface Action {
  letter: Letter;
  /** How long it takes, e.g. «15 минут». */
  time: string;
  title: string;
  text: string;
}

/** One first action per letter. Product copy from the prototype. */
export const ACTS: Record<Letter, Omit<Action, 'letter'>> = {
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

const FALLBACK_ACTIONS: readonly Letter[] = ['О', 'Д', 'Б'];

/** Up to three actions for the weakest letters (score < 2); fallback О, Д, Б. */
export function pickActions(letterScores: readonly number[]): Action[] {
  const weakest = WORD.map((letter, i) => ({ letter, s: letterScores[i] ?? 0 }))
    .filter((x) => x.s < 2)
    .sort((a, b) => a.s - b.s)
    .slice(0, 3)
    .map((x) => x.letter);
  const letters = weakest.length ? weakest : FALLBACK_ACTIONS;
  return letters.map((letter) => ({ letter, ...ACTS[letter] }));
}

/**
 * Scores approximated from a result code (shared links carry states only):
 * fallen 0, hanging 1, on the board 2. Used to pick actions on result pages.
 */
export function scoresFromStates(states: readonly number[]): number[] {
  return states.map((s) => (s >= 2 ? 2 : s === 1 ? 1 : 0));
}
