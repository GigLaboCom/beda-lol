import { describe, expect, it } from 'vitest';
import { fallenLetters, findRemoval, hasStopWord, normalizeName, verdict } from './namer';

describe('normalizeName', () => {
  it('collapses spaces, trims, upper-cases and cuts to 14', () => {
    expect(normalizeName('  таск   менеджер  ')).toBe('ТАСК МЕНЕДЖЕР');
    expect(normalizeName('очень-длинное-название')).toBe('ОЧЕНЬ-ДЛИННОЕ-');
    expect(normalizeName('abcdefghijklm nop')).toBe('ABCDEFGHIJKLM');
  });
});

describe('findRemoval', () => {
  it('ПОБЕДА → беда, П and О fall', () => {
    expect(findRemoval('ПОБЕДА')).toEqual({ removed: [0, 1], word: 'беда', found: true });
  });

  it.each([
    ['БАГТРЕКЕР', 'баг'],
    ['DEADLINE', 'dead'],
    ['ТАСК МЕНЕДЖЕР', 'ад'],
  ])('%s → %s', (name, word) => {
    const r = findRemoval(name);
    expect(r.found).toBe(true);
    expect(r.word).toBe(word);
    expect(r.removed.length).toBeGreaterThan(0);
  });

  it('never counts the space as a removed letter', () => {
    const r = findRemoval('ТАСК МЕНЕДЖЕР');
    expect(r.removed).not.toContain(4);
  });

  it('ТРЕКЕР → fallback «ЕКЕР» (first two letters fall)', () => {
    expect(findRemoval('ТРЕКЕР')).toEqual({ removed: [0, 1], word: 'ЕКЕР', found: false });
  });

  it('short names lose one letter in the fallback', () => {
    expect(findRemoval('ЖУК')).toEqual({ removed: [0], word: 'УК', found: false });
  });

  it('must remove at least one letter: a name equal to a funny word is not a match', () => {
    const r = findRemoval('ДНО');
    expect(r.word).not.toBe('дно');
    expect(r.removed.length).toBeGreaterThan(0);
  });

  it('drops only the first letter when the fallback remainder hits the stop list', () => {
    // Same rule as the prototype. The remainder is a suffix, so dropping one
    // letter instead of two cannot remove the stop word — see README follow-up.
    const r = findRemoval('ЗЫСУКЖ');
    expect(hasStopWord('СУКЖ')).toBe(true);
    expect(r).toEqual({ removed: [0], word: 'ЫСУКЖ', found: false });
  });
});

describe('fallenLetters', () => {
  it.each([
    [1, 'Одна отвалившаяся буква'],
    [2, '2 отвалившиеся буквы'],
    [4, '4 отвалившиеся буквы'],
    [5, '5 отвалившихся букв'],
    [11, '11 отвалившихся букв'],
    [12, '12 отвалившихся букв'],
    [21, '21 отвалившаяся буква'],
    [22, '22 отвалившиеся буквы'],
  ])('%i → %s', (k, text) => {
    expect(fallenLetters(k)).toBe(text);
  });
});

describe('verdict', () => {
  it('names the new ship when a word was found', () => {
    const v = verdict('Багтрекер', findRemoval('БАГТРЕКЕР'));
    expect(v.was).toBe('Было: Багтрекер');
    expect(v.now).toBe('Стало: БАГ');
    expect(v.text).toBe(
      '6 отвалившихся букв — и судно уже называется «БАГ». Маркетинг держится на меньшем, чем кажется.',
    );
  });

  it('uses the diagnosis line when no word was found', () => {
    const v = verdict('трекер', findRemoval('ТРЕКЕР'));
    expect(v.now).toBe('Стало: ЕКЕР');
    expect(v.text).toMatch(/^Слово не сложилось/);
  });

  it('shows an ellipsis for an empty remainder', () => {
    expect(verdict('', { removed: [], word: '', found: false }).now).toBe('Стало: …');
  });
});
