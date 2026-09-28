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
  it('turns ДЕНЬГИ into ЛЕНЬ', () => {
    const ops: Op[] = [
      { i: 0, brk: 'Д>Л' },
      { i: 4, fall: true },
      { i: 5, fall: true },
    ];
    expect(applyOps('ДЕНЬГИ', ops)).toBe('ЛЕНЬ');
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
