import { describe, expect, it } from 'vitest';
import { applyOps } from './breaks';
import {
  FUNNY_EN,
  FUNNY_RU,
  findOps,
  getFunny,
  hasStopWord,
  MAX_NAME_LENGTH,
  opsSummary,
  prepareName,
  verdict,
} from './namer';

const falls = (r: ReturnType<typeof findOps>) => r.ops.filter((o) => 'fall' in o).map((o) => o.i);
const breaks = (r: ReturnType<typeof findOps>) =>
  r.ops.flatMap((o) => ('brk' in o ? [`${o.i}:${o.brk}`] : []));

describe('prepareName', () => {
  it('normalises and cuts to 14', () => {
    expect(prepareName('  таск   менеджер  ').name).toBe('ТАСК МЕНЕДЖЕР');
    expect(prepareName('очень-длинное-название').name).toBe('ОЧЕНЬ-ДЛИННОЕ-');
    expect(prepareName('abcdefghijklm nop').name).toBe('ABCDEFGHIJKLM');
    expect(prepareName('Rocket 🚀').removed).toEqual(['🚀']);
    expect(Array.from(prepareName('ы'.repeat(30)).name)).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('findOps', () => {
  it('ПОБЕДА → беда, П and О fall', () => {
    expect(findOps('ПОБЕДА')).toEqual({
      ops: [
        { i: 0, fall: true },
        { i: 1, fall: true },
      ],
      word: 'беда',
      found: true,
    });
  });

  it.each([
    ['ДЕНЬГИ', 'лень', ['0:Д>Л'], [4, 5]],
    ['ДОХОДНЫЙ', 'дохлый', ['4:Д>Л'], [3, 5]],
    ['ОГОНЬ', 'сон', ['0:О>С'], [1, 4]],
    ['ПОЛЁТ', 'лёг', ['4:Т>Г'], [0, 1]],
    ['BETA', 'pet', ['0:B>P'], [3]],
    ['GOLD RUSH', 'cold push', ['0:G>C', '5:R>P'], []],
    ['ШТУРМАН', 'туман', [], [0, 3]],
    ['МЕДАЛЬ', 'мель', [], [2, 3]],
  ])('%s → %s (catalogue pair, with breaks)', (name, word, brk, fall) => {
    const r = findOps(name);
    expect(r.word).toBe(word);
    expect(breaks(r)).toEqual(brk);
    expect(falls(r)).toEqual(fall);
    expect(applyOps(name, r.ops).toLowerCase()).toBe(word);
  });

  it.each([
    ['БАГТРЕКЕР', 'баг'],
    ['DEADLINE', 'dead'],
    ['ТАСК МЕНЕДЖЕР', 'ад'],
  ])('keeps the S11 expectation %s → %s', (name, word) => {
    const r = findOps(name);
    expect(r.found).toBe(true);
    expect(r.word).toBe(word);
    expect(r.ops.length).toBeGreaterThan(0);
  });

  it('never drops a space or punctuation: it stays on the board and is skipped', () => {
    expect(falls(findOps('ТАСК МЕНЕДЖЕР'))).not.toContain(4);
    const r = findOps('NODE.JS');
    expect(r.ops.map((o) => o.i)).not.toContain(4);
    expect(applyOps('NODE.JS', r.ops)).toContain('.');
  });

  it('ТРЕКЕР → fallback «ЕКЕР» (first two letters fall)', () => {
    expect(findOps('ТРЕКЕР')).toEqual({
      ops: [
        { i: 0, fall: true },
        { i: 1, fall: true },
      ],
      word: 'ЕКЕР',
      found: false,
    });
  });

  it('short names lose one letter in the fallback', () => {
    expect(findOps('ЖУК')).toEqual({ ops: [{ i: 0, fall: true }], word: 'УК', found: false });
  });

  it('must change at least one letter: a name equal to a funny word is not a match', () => {
    const r = findOps('ДНО');
    expect(r.word).not.toBe('дно');
    expect(r.ops.length).toBeGreaterThan(0);
  });

  it('drops only the first letter when the fallback remainder hits the stop list', () => {
    const r = findOps('ЗЫСУКЖ');
    expect(hasStopWord('СУКЖ')).toBe(true);
    expect(r).toEqual({ ops: [{ i: 0, fall: true }], word: 'ЫСУКЖ', found: false });
  });

  it('never lets a break create a stop word', () => {
    for (const name of ['СУКЖ', 'ДЕНЬГИ', 'BETA', 'ОГОНЬ', 'ПОБЕДА', 'FUСK']) {
      expect(hasStopWord(applyOps(name, findOps(name).ops)), name).toBe(false);
    }
  });

  it('prefers whole-letter drops to breaks for the same word, then the earliest ops', () => {
    // «беда»: nothing to break; the earlier Б is dropped, the later one kept.
    expect(falls(findOps('ББЕДА'))).toEqual([0]);
    // «лень» from ЛДЕНЬ: dropping Д beats breaking it (Д>Л) and dropping Л.
    const r = findOps('ЛДЕНЬ');
    expect(r.word).toBe('лень');
    expect(breaks(r)).toEqual([]);
    expect(falls(r)).toEqual([1]);
  });

  it('is fast on a 14-letter name', () => {
    const name = 'ДОБЕДАЛЕНЬГОТЁ';
    findOps(name);
    const t0 = performance.now();
    for (let k = 0; k < 20; k++) findOps(name);
    expect((performance.now() - t0) / 20).toBeLessThan(5);
  });
});

describe('word lists', () => {
  it('keeps both languages reachable from either page, own words first', () => {
    expect(getFunny('ru')[0]).toBe(FUNNY_RU[0]);
    expect(getFunny('en')[0]).toBe(FUNNY_EN[0]);
    expect(new Set(getFunny('ru'))).toEqual(new Set(getFunny('en')));
    expect(FUNNY_RU).toEqual(expect.arrayContaining(['лёг', 'туман', 'пыль', 'ох', 'ой', 'вред']));
    expect(FUNNY_EN).toEqual(expect.arrayContaining(['cold', 'pest', 'pet', 'cost', 'stall']));
  });
});

describe('opsSummary', () => {
  it.each([
    [1, 0, 'Одна буква отвалилась'],
    [2, 0, '2 буквы отвалились'],
    [5, 0, '5 букв отвалились'],
    [21, 0, '21 буква отвалилась'],
    [2, 1, '2 буквы отвалились, у одной откололся кусок'],
    [0, 1, 'У одной буквы откололся кусок'],
    [0, 2, 'У двух букв откололись куски'],
  ])('%i falls, %i breaks → %s', (f, b, text) => {
    const ops = [
      ...Array.from({ length: f }, (_, i) => ({ i, fall: true as const })),
      ...Array.from({ length: b }, (_, i) => ({ i: 100 + i, brk: 'Д>Л' as const })),
    ];
    expect(opsSummary(ops)).toBe(text);
  });

  it('speaks English', () => {
    expect(opsSummary([{ i: 0, fall: true }], 'en')).toBe('One letter fell off');
    expect(
      opsSummary(
        [
          { i: 0, fall: true },
          { i: 1, fall: true },
          { i: 2, brk: 'B>P' },
        ],
        'en',
      ),
    ).toBe('2 letters fell off, one lost a piece');
    expect(opsSummary([{ i: 0, brk: 'B>P' }], 'en')).toBe('One letter lost a piece');
  });
});

describe('verdict', () => {
  it('names the new ship when a word was found', () => {
    const v = verdict('Багтрекер', findOps('БАГТРЕКЕР'));
    expect(v.was).toBe('Было: Багтрекер');
    expect(v.now).toBe('Стало: БАГ');
    expect(v.text).toBe(
      '6 букв отвалились — и судно уже называется «БАГ». Маркетинг держится на меньшем, чем кажется.',
    );
  });

  it('counts breaks in the summary', () => {
    expect(verdict('Деньги', findOps('ДЕНЬГИ')).text).toMatch(
      /^2 буквы отвалились, у одной откололся кусок — и судно уже называется «ЛЕНЬ»/,
    );
  });

  it('uses the diagnosis line when no word was found', () => {
    const v = verdict('трекер', findOps('ТРЕКЕР'));
    expect(v.now).toBe('Стало: ЕКЕР');
    expect(v.text).toMatch(/^Слово не сложилось/);
  });

  it('shows an ellipsis for an empty remainder', () => {
    expect(verdict('', { ops: [], word: '', found: false }).now).toBe('Стало: …');
  });
});
