/**
 * The pun catalogue for the transom: a text, what falls off or breaks, and
 * what is left (docs/tactics/10-otval-katalog.md; ported from the gags of
 * archive/src/transom-falls.html). `lang` is the language of the pun, not of
 * the page; the copy around it is per UI locale (`getGagCopy`).
 *
 * BEST LAUNCH → PEST LUNCH is left out: the catalogue rejects it, because it
 * rests on LAUNCH → LUNCH (D2).
 */
import type { Op } from './breaks';
import { DEFAULT_LOCALE, type Locale } from './locale';

export interface Gag {
  id: string;
  /** Language of the pun. */
  lang: Locale;
  text: string;
  result: string;
  ops: readonly Op[];
  /** `false` keeps it off public pages (dev benches only). */
  public?: boolean;
}

/** Copy around a gag: what falls off (`meta`) and the punchline (`joke`). */
export interface GagCopy {
  meta: string;
  joke: string;
}

export const GAGS = [
  {
    id: 'pobeda',
    lang: 'ru',
    text: 'ПОБЕДА',
    result: 'БЕДА',
    ops: [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  },
  {
    id: 'polyot',
    lang: 'ru',
    text: 'ПОЛЁТ',
    result: 'ЛЁГ',
    ops: [
      { i: 0, fall: true },
      { i: 1, fall: true },
      { i: 4, brk: 'Т>Г' },
    ],
  },
  {
    id: 'polnyj-vperyod',
    lang: 'ru',
    text: 'ПОЛНЫЙ ВПЕРЁД',
    result: 'ПОЛНЫЙ ВРЕД',
    ops: [
      { i: 8, fall: true },
      { i: 9, fall: true },
      { i: 11, brk: 'Ё>Е' },
    ],
  },
  {
    id: 'svoj-proekt',
    lang: 'ru',
    text: 'СВОЙ ПРОЕКТ',
    result: 'ОЙ ПРОЕКТ',
    ops: [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  },
  {
    id: 'shturman',
    lang: 'ru',
    text: 'ШТУРМАН',
    result: 'ТУМАН',
    ops: [
      { i: 0, fall: true },
      { i: 3, fall: true },
    ],
  },
  {
    id: 'medal',
    lang: 'ru',
    text: 'МЕДАЛЬ',
    result: 'МЕЛЬ',
    ops: [
      { i: 2, fall: true },
      { i: 3, fall: true },
    ],
  },
  {
    id: 'dengi',
    lang: 'ru',
    text: 'ДЕНЬГИ',
    result: 'ЛЕНЬ',
    ops: [
      { i: 0, brk: 'Д>Л' },
      { i: 4, fall: true },
      { i: 5, fall: true },
    ],
  },
  {
    id: 'dohodnyj',
    lang: 'ru',
    text: 'ДОХОДНЫЙ',
    result: 'ДОХЛЫЙ',
    ops: [
      { i: 3, fall: true },
      { i: 4, brk: 'Д>Л' },
      { i: 5, fall: true },
    ],
  },
  {
    id: 'dohod',
    lang: 'ru',
    text: 'ДОХОД',
    result: 'ЛОХ',
    ops: [
      { i: 0, brk: 'Д>Л' },
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
    // «Грубовато — решать автору» (catalogue): off public pages until the author decides.
    public: false,
  },
  {
    id: 'ogon',
    lang: 'ru',
    text: 'ОГОНЬ',
    result: 'СОН',
    ops: [
      { i: 0, brk: 'О>С' },
      { i: 1, fall: true },
      { i: 4, fall: true },
    ],
  },
  {
    id: 'vzlyot',
    lang: 'ru',
    text: 'ВЗЛЁТ',
    result: 'ЛЁГ',
    ops: [
      { i: 0, fall: true },
      { i: 1, fall: true },
      { i: 4, brk: 'Т>Г' },
    ],
  },
  {
    id: 'triumf',
    lang: 'ru',
    text: 'ТРИУМФ',
    result: 'РИФ',
    ops: [
      { i: 0, fall: true },
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
  },
  {
    id: 'pribyl',
    lang: 'ru',
    text: 'ПРИБЫЛЬ',
    result: 'ПЫЛЬ',
    ops: [
      { i: 1, fall: true },
      { i: 2, fall: true },
      { i: 3, fall: true },
    ],
  },
  {
    id: 'udachno',
    lang: 'ru',
    text: 'УДАЧНО',
    result: 'ДНО',
    ops: [
      { i: 0, fall: true },
      { i: 2, fall: true },
      { i: 3, fall: true },
    ],
  },
  {
    id: 'ohvat',
    lang: 'ru',
    text: 'ОХВАТ',
    result: 'ОХ',
    ops: [
      { i: 2, fall: true },
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
  },
  {
    id: 'gold-rush',
    lang: 'en',
    text: 'GOLD RUSH',
    result: 'COLD PUSH',
    ops: [
      { i: 0, brk: 'G>C' },
      { i: 5, brk: 'R>P' },
    ],
  },
  {
    id: 'best-bet',
    lang: 'en',
    text: 'BEST BET',
    result: 'PEST PET',
    ops: [
      { i: 0, brk: 'B>P' },
      { i: 5, brk: 'B>P' },
    ],
  },
  {
    id: 'beta',
    lang: 'en',
    text: 'BETA',
    result: 'PET',
    ops: [
      { i: 0, brk: 'B>P' },
      { i: 3, fall: true },
    ],
  },
  {
    id: 'big-boost',
    lang: 'en',
    text: 'BIG BOOST',
    result: 'BIG COST',
    ops: [
      { i: 4, fall: true },
      { i: 5, brk: 'O>C' },
    ],
  },
  {
    id: 'stable',
    lang: 'en',
    text: 'STABLE',
    result: 'STALL',
    ops: [
      { i: 3, fall: true },
      { i: 5, brk: 'E>L' },
    ],
  },
  {
    id: 'goals',
    lang: 'en',
    text: 'GOALS',
    result: 'COAL',
    ops: [
      { i: 0, brk: 'G>C' },
      { i: 4, fall: true },
    ],
  },
  {
    id: 'proof',
    lang: 'en',
    text: 'PROOF',
    result: 'OOF',
    ops: [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  },
  {
    id: 'power',
    lang: 'en',
    text: 'POWER',
    result: 'OWE',
    ops: [
      { i: 0, fall: true },
      { i: 4, fall: true },
    ],
  },
  {
    id: 'pitch-deck',
    lang: 'en',
    text: 'PITCH DECK',
    result: 'PIT DECK',
    ops: [
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
  },
  {
    id: 'demand',
    lang: 'en',
    text: 'DEMAND',
    result: 'DEAD',
    ops: [
      { i: 2, fall: true },
      { i: 4, fall: true },
    ],
  },
  {
    id: 'brand',
    lang: 'en',
    text: 'BRAND',
    result: 'BAD',
    ops: [
      { i: 1, fall: true },
      { i: 3, fall: true },
    ],
  },
  {
    id: 'robust',
    lang: 'en',
    text: 'ROBUST',
    result: 'BUST',
    ops: [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  },
  {
    id: 'hockey-stick',
    lang: 'en',
    text: 'HOCKEY STICK',
    result: 'HOKEY SICK',
    ops: [
      { i: 2, fall: true },
      { i: 8, fall: true },
    ],
  },
  {
    id: 'growth',
    lang: 'en',
    text: 'GROWTH',
    result: 'ROT',
    ops: [
      { i: 0, fall: true },
      { i: 3, fall: true },
      { i: 5, fall: true },
    ],
  },
  {
    id: 'unicorn',
    lang: 'en',
    text: 'UNICORN',
    result: 'CORN',
    ops: [
      { i: 0, fall: true },
      { i: 1, fall: true },
      { i: 2, fall: true },
    ],
  },
] as const satisfies readonly Gag[];

export type GagId = (typeof GAGS)[number]['id'];

/** Russian copy, from the prototype. */
export const GAG_COPY_RU: Record<GagId, GagCopy> = {
  pobeda: { meta: 'П и О срываются целиком', joke: 'Оригинал: ПО есть, победы нет.' },
  polyot: {
    meta: 'снова ПО целиком, у Т — левая половина перекладины',
    joke: 'Двойник ПОБЕДЫ: без ПО полёт превращается в «прод лёг».',
  },
  'polnyj-vperyod': {
    meta: 'П и Е целиком, у Ё осыпаются точки',
    joke: 'Морская команда стала диагнозом.',
  },
  'svoj-proekt': { meta: 'С и В', joke: '«Свой проект» — «ой, проект».' },
  shturman: { meta: 'Ш и Р', joke: 'Штурмана нет — есть туман.' },
  medal: { meta: 'Д и А', joke: 'Шли за медалью, сели на мель.' },
  dengi: { meta: 'основание Д, Г и И целиком', joke: 'От денег осталась лень.' },
  dohodnyj: { meta: 'О и Н целиком, основание Д', joke: 'Доходный проект оказался дохлым.' },
  dohod: { meta: 'основание Д, О и Д целиком', joke: 'Грубовато, но честно.' },
  ogon: { meta: 'кусок О, Г и Ь целиком', joke: 'Было «огонь», стало «сон».' },
  vzlyot: {
    meta: 'В и З целиком, половина перекладины Т',
    joke: 'Взлёт закончился тем, что всё легло.',
  },
  triumf: { meta: 'Т, У, М — три буквы', joke: 'Триумф налетел на риф.' },
  pribyl: { meta: 'Р, И, Б — три буквы', joke: 'От прибыли осталась пыль.' },
  udachno: { meta: 'У, А, Ч — три буквы', joke: '«Удачно» — это дно.' },
  ohvat: { meta: 'В, А, Т — три буквы', joke: 'Охват в маркетинге: ох.' },
  'gold-rush': {
    meta: 'шпора G, ножка R',
    joke: 'Бум, на который все бежали, превратился в холодное навязчивое продвижение.',
  },
  'best-bet': { meta: 'нижние чаши двух B', joke: 'Верная ставка стала пет-проектом-вредителем.' },
  beta: { meta: 'чаша B, буква A целиком', joke: 'Твоя бета — просто пет-проект.' },
  'big-boost': { meta: 'B целиком, кусок O', joke: 'Ждал рывка роста, получил большие расходы.' },
  stable: { meta: 'B целиком, перекладины E', joke: 'Стабильный релиз заглох.' },
  goals: { meta: 'шпора G, буква S целиком', joke: 'Цели превратились в уголь.' },
  proof: { meta: 'P и R — то есть PR', joke: 'Без пиара доказательство превращается в «уф».' },
  power: { meta: 'P и R с краёв', joke: 'Без пиара сила превращается в долг.' },
  'pitch-deck': { meta: 'C и H', joke: 'Презентация для инвесторов стала ямой.' },
  demand: { meta: 'M и N', joke: 'Спрос мёртв.' },
  brand: { meta: 'R и N', joke: 'Про личный бренд.' },
  robust: { meta: 'R и O', joke: '«Надёжный» стал провалом.' },
  'hockey-stick': { meta: 'C и T', joke: 'Рост «хоккейной клюшкой» оказался фальшивым и больным.' },
  growth: { meta: 'G, W, H — три буквы', joke: 'Рост сгнил.' },
  unicorn: { meta: 'U, N, I — три буквы', joke: 'Единорог стал кукурузой.' },
};

/** English copy, drafted for review (D7). Russian puns are explained, not re-punned. */
export const GAG_COPY_EN: Record<GagId, GagCopy> = {
  pobeda: {
    meta: 'П and О fall off whole',
    joke: 'The original: ПО (the software) is there, ПОБЕДА (the win) is not, and БЕДА (trouble) is what stays.',
  },
  polyot: {
    meta: 'ПО falls off again, and Т loses the left half of its bar',
    joke: 'ПОБЕДА’s twin: without ПО, ПОЛЁТ (the flight) becomes ЛЁГ, as in “prod went down”.',
  },
  'polnyj-vperyod': {
    meta: 'П and Е fall off whole, Ё loses its dots',
    joke: 'The sea command “full speed ahead” becomes a diagnosis: “full harm”.',
  },
  'svoj-proekt': { meta: 'С and В', joke: '“My own project” becomes “oops, a project”.' },
  shturman: { meta: 'Ш and Р', joke: 'No navigator (ШТУРМАН), only fog (ТУМАН).' },
  medal: { meta: 'Д and А', joke: 'Sailed for a medal (МЕДАЛЬ), ran aground on a shoal (МЕЛЬ).' },
  dengi: {
    meta: 'the base of Д, then Г and И whole',
    joke: 'Of the money (ДЕНЬГИ), only laziness (ЛЕНЬ) is left.',
  },
  dohodnyj: {
    meta: 'О and Н whole, the base of Д',
    joke: 'The profitable (ДОХОДНЫЙ) project turned out dead (ДОХЛЫЙ).',
  },
  dohod: {
    meta: 'the base of Д, then О and Д whole',
    joke: 'Rude but honest: the income (ДОХОД) leaves a sucker (ЛОХ).',
  },
  ogon: {
    meta: 'a chip of О, then Г and Ь whole',
    joke: 'It was “fire” (ОГОНЬ), now it is sleep (СОН).',
  },
  vzlyot: {
    meta: 'В and З whole, half of Т’s bar',
    joke: 'The take-off (ВЗЛЁТ) ended with everything down (ЛЁГ).',
  },
  triumf: { meta: 'Т, У, М: three letters', joke: 'The triumph (ТРИУМФ) hit a reef (РИФ).' },
  pribyl: {
    meta: 'Р, И, Б: three letters',
    joke: 'Of the profit (ПРИБЫЛЬ), only dust (ПЫЛЬ) is left.',
  },
  udachno: { meta: 'У, А, Ч: three letters', joke: '“Nicely done” (УДАЧНО) is rock bottom (ДНО).' },
  ohvat: { meta: 'В, А, Т: three letters', joke: 'Marketing reach (ОХВАТ): oh (ОХ).' },
  'gold-rush': {
    meta: 'the spur of G, the leg of R',
    joke: 'The boom everyone ran for turned into cold, pushy promotion.',
  },
  'best-bet': {
    meta: 'the lower bowls of both B',
    joke: 'The safe bet became a pest of a pet project.',
  },
  beta: { meta: 'the bowl of B, A whole', joke: 'Your beta is just a pet project.' },
  'big-boost': { meta: 'B whole, a chip of O', joke: 'Expected a growth spurt, got a big bill.' },
  stable: { meta: 'B whole, the arms of E', joke: 'The stable release stalled.' },
  goals: { meta: 'the spur of G, S whole', joke: 'The goals turned into coal.' },
  proof: { meta: 'P and R, that is, PR', joke: 'Without PR, proof turns into “oof”.' },
  power: { meta: 'P and R at the ends', joke: 'Without PR, power turns into debt.' },
  'pitch-deck': { meta: 'C and H', joke: 'The investor deck became a pit.' },
  demand: { meta: 'M and N', joke: 'Demand is dead.' },
  brand: { meta: 'R and N', joke: 'On personal branding.' },
  robust: { meta: 'R and O', joke: '“Robust” became a bust.' },
  'hockey-stick': { meta: 'C and T', joke: 'The hockey-stick growth turned out hokey and sick.' },
  growth: { meta: 'G, W, H: three letters', joke: 'Growth rotted.' },
  unicorn: { meta: 'U, N, I: three letters', joke: 'The unicorn became corn.' },
};

const COPY: Record<Locale, Record<GagId, GagCopy>> = { ru: GAG_COPY_RU, en: GAG_COPY_EN };

export function gagById(id: string): Gag | undefined {
  return GAGS.find((g) => g.id === id);
}

/** Gags whose pun is in `lang`, in catalogue order. */
export function gagsByLang(lang: Locale): Gag[] {
  return GAGS.filter((g) => g.lang === lang);
}

/** Copy for a gag in a UI locale (defaults to Russian). Throws on an unknown id. */
export function getGagCopy(id: string, locale: Locale = DEFAULT_LOCALE): GagCopy {
  const copy = (COPY[locale] ?? GAG_COPY_RU)[id as GagId];
  if (!copy) throw new Error(`no gag ${id}`);
  return copy;
}

/** Gags that may appear on public pages (404 plaque, footer), for pun language `lang`. */
export function publicGags(lang: Locale): Gag[] {
  return gagsByLang(lang).filter((g) => g.public !== false);
}

/** FNV-1a, 32 bit: a stable small hash for picking. */
function hash(key: string): number {
  let h = 0x811c9dc5;
  for (const ch of key) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * A public gag chosen deterministically by `key` (e.g. the page path), so the
 * server and the client, or two builds of the same page, agree.
 */
export function pickGag(key: string, lang: Locale): Gag {
  const list = publicGags(lang);
  return list[hash(key) % list.length] as Gag;
}
