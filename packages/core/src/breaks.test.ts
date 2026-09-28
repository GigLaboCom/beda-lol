import { describe, expect, it } from 'vitest';
import {
  applyOps,
  BREAKS,
  breakFrom,
  breaksFor,
  breakTo,
  isBreakKey,
  type Op,
  validateOps,
} from './breaks';

/**
 * The 31 gags of the falls prototype (archive/src/transom-falls.html), as
 * checked there by archive/tools/pun-search/11-verify-gags.py. S08d moves
 * them into `gags.ts`; until then they are the fixture of the break logic.
 */
const GAGS: [text: string, result: string, ops: Op[]][] = [
  [
    'ПОБЕДА',
    'БЕДА',
    [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  ],
  [
    'ПОЛЁТ',
    'ЛЁГ',
    [
      { i: 0, fall: true },
      { i: 1, fall: true },
      { i: 4, brk: 'Т>Г' },
    ],
  ],
  [
    'ПОЛНЫЙ ВПЕРЁД',
    'ПОЛНЫЙ ВРЕД',
    [
      { i: 8, fall: true },
      { i: 9, fall: true },
      { i: 11, brk: 'Ё>Е' },
    ],
  ],
  [
    'СВОЙ ПРОЕКТ',
    'ОЙ ПРОЕКТ',
    [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  ],
  [
    'ШТУРМАН',
    'ТУМАН',
    [
      { i: 0, fall: true },
      { i: 3, fall: true },
    ],
  ],
  [
    'МЕДАЛЬ',
    'МЕЛЬ',
    [
      { i: 2, fall: true },
      { i: 3, fall: true },
    ],
  ],
  [
    'ДЕНЬГИ',
    'ЛЕНЬ',
    [
      { i: 0, brk: 'Д>Л' },
      { i: 4, fall: true },
      { i: 5, fall: true },
    ],
  ],
  [
    'ДОХОДНЫЙ',
    'ДОХЛЫЙ',
    [
      { i: 3, fall: true },
      { i: 4, brk: 'Д>Л' },
      { i: 5, fall: true },
    ],
  ],
  [
    'ДОХОД',
    'ЛОХ',
    [
      { i: 0, brk: 'Д>Л' },
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
  ],
  [
    'ОГОНЬ',
    'СОН',
    [
      { i: 0, brk: 'О>С' },
      { i: 1, fall: true },
      { i: 4, fall: true },
    ],
  ],
  [
    'ВЗЛЁТ',
    'ЛЁГ',
    [
      { i: 0, fall: true },
      { i: 1, fall: true },
      { i: 4, brk: 'Т>Г' },
    ],
  ],
  [
    'ТРИУМФ',
    'РИФ',
    [
      { i: 0, fall: true },
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
  ],
  [
    'ПРИБЫЛЬ',
    'ПЫЛЬ',
    [
      { i: 1, fall: true },
      { i: 2, fall: true },
      { i: 3, fall: true },
    ],
  ],
  [
    'УДАЧНО',
    'ДНО',
    [
      { i: 0, fall: true },
      { i: 2, fall: true },
      { i: 3, fall: true },
    ],
  ],
  [
    'ОХВАТ',
    'ОХ',
    [
      { i: 2, fall: true },
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
  ],
  [
    'GOLD RUSH',
    'COLD PUSH',
    [
      { i: 0, brk: 'G>C' },
      { i: 5, brk: 'R>P' },
    ],
  ],
  [
    'BEST BET',
    'PEST PET',
    [
      { i: 0, brk: 'B>P' },
      { i: 5, brk: 'B>P' },
    ],
  ],
  [
    'BETA',
    'PET',
    [
      { i: 0, brk: 'B>P' },
      { i: 3, fall: true },
    ],
  ],
  [
    'BIG BOOST',
    'BIG COST',
    [
      { i: 4, fall: true },
      { i: 5, brk: 'O>C' },
    ],
  ],
  [
    'STABLE',
    'STALL',
    [
      { i: 3, fall: true },
      { i: 5, brk: 'E>L' },
    ],
  ],
  [
    'BEST LAUNCH',
    'PEST LUNCH',
    [
      { i: 0, brk: 'B>P' },
      { i: 6, fall: true },
    ],
  ],
  [
    'GOALS',
    'COAL',
    [
      { i: 0, brk: 'G>C' },
      { i: 4, fall: true },
    ],
  ],
  [
    'PROOF',
    'OOF',
    [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  ],
  [
    'POWER',
    'OWE',
    [
      { i: 0, fall: true },
      { i: 4, fall: true },
    ],
  ],
  [
    'PITCH DECK',
    'PIT DECK',
    [
      { i: 3, fall: true },
      { i: 4, fall: true },
    ],
  ],
  [
    'DEMAND',
    'DEAD',
    [
      { i: 2, fall: true },
      { i: 4, fall: true },
    ],
  ],
  [
    'BRAND',
    'BAD',
    [
      { i: 1, fall: true },
      { i: 3, fall: true },
    ],
  ],
  [
    'ROBUST',
    'BUST',
    [
      { i: 0, fall: true },
      { i: 1, fall: true },
    ],
  ],
  [
    'HOCKEY STICK',
    'HOKEY SICK',
    [
      { i: 2, fall: true },
      { i: 8, fall: true },
    ],
  ],
  [
    'GROWTH',
    'ROT',
    [
      { i: 0, fall: true },
      { i: 3, fall: true },
      { i: 5, fall: true },
    ],
  ],
  [
    'UNICORN',
    'CORN',
    [
      { i: 0, fall: true },
      { i: 1, fall: true },
      { i: 2, fall: true },
    ],
  ],
];

describe('breaks', () => {
  it('has the 19 catalogue breaks and no M>N', () => {
    expect(BREAKS).toHaveLength(19);
    expect(new Set(BREAKS).size).toBe(BREAKS.length);
    expect(isBreakKey('M>N')).toBe(false);
  });

  it('splits a key into the letter that breaks and the letter that remains', () => {
    expect(breakFrom('Д>Л')).toBe('Д');
    expect(breakTo('Д>Л')).toBe('Л');
    for (const key of BREAKS) {
      expect(Array.from(breakFrom(key))).toHaveLength(1);
      expect(Array.from(breakTo(key))).toHaveLength(1);
    }
  });

  it('lists every break of a letter in table order', () => {
    expect(breaksFor('Б')).toEqual(['Б>Ь', 'Б>Г']);
    expect(breaksFor('E')).toEqual(['E>L', 'E>F']);
    expect(breaksFor('Д')).toEqual(['Д>Л']);
    expect(breaksFor('Я')).toEqual([]);
    expect(breaksFor('M')).toEqual([]);
  });
});

describe('applyOps', () => {
  it.for(GAGS)('%s → %s', ([text, result, ops]) => {
    expect(validateOps(text, ops)).toEqual([]);
    expect(applyOps(text, ops)).toBe(result);
  });

  it('covers all 31 gags', () => {
    expect(GAGS).toHaveLength(31);
  });

  it('collapses spaces left by fallen letters', () => {
    expect(applyOps('A B C', [{ i: 2, fall: true }])).toBe('A C');
    expect(applyOps('A B', [{ i: 0, fall: true }])).toBe('B');
  });

  it('counts code points, not UTF-16 units', () => {
    expect(applyOps('🚀ДА', [{ i: 1, brk: 'Д>Л' }])).toBe('🚀ЛА');
  });
});

describe('validateOps', () => {
  it('rejects a break on the wrong letter', () => {
    expect(validateOps('ДА', [{ i: 1, brk: 'Д>Л' }])).toEqual(['index 1 is А, not Д']);
  });

  it('rejects an op on a space', () => {
    expect(validateOps('A B', [{ i: 1, fall: true }])).toEqual(['index 1 is a space']);
  });

  it('rejects a duplicate index', () => {
    expect(
      validateOps('ДА', [
        { i: 0, fall: true },
        { i: 0, brk: 'Д>Л' },
      ]),
    ).toEqual(['index 0 is used twice']);
  });

  it('rejects an index out of range', () => {
    expect(validateOps('ДА', [{ i: 2, fall: true }])).toEqual(['index 2 is out of range']);
    expect(validateOps('ДА', [{ i: -1, fall: true }])).toEqual(['index -1 is out of range']);
    expect(validateOps('ДА', [{ i: 0.5, fall: true }])).toEqual(['index 0.5 is out of range']);
  });

  it('rejects an unknown break key', () => {
    const op = { i: 0, brk: 'M>N' } as unknown as Op;
    expect(validateOps('M', [op])).toEqual(['unknown break M>N']);
  });
});
