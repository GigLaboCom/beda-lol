import { describe, expect, it } from 'vitest';
import { WORD } from './letters';
import {
  type Answer,
  classify,
  finalNails,
  liveNails,
  pickActions,
  QUESTION_COUNT,
  QUESTIONS,
  scores,
} from './quiz';

describe('questions', () => {
  it('has twelve questions, two per letter, in word order', () => {
    expect(QUESTION_COUNT).toBe(12);
    expect(QUESTIONS.map((q) => q.letter)).toEqual(WORD.flatMap((l) => [l, l]));
  });

  it('every question has text and a hint', () => {
    for (const q of QUESTIONS) {
      expect(q.text.length).toBeGreaterThan(10);
      expect(q.hint.length).toBeGreaterThan(5);
    }
  });
});

describe('liveNails', () => {
  it('starts with everything nailed', () => {
    expect(liveNails([])).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it('«нет» knocks two nails, «частично» one', () => {
    expect(liveNails([0])).toEqual([2, 4, 4, 4, 4, 4]);
    expect(liveNails([0, 0.5])).toEqual([1, 4, 4, 4, 4, 4]);
    expect(liveNails([0, 0, 0.5, 1])).toEqual([0, 3, 4, 4, 4, 4]);
  });

  it('ignores answers beyond the last question', () => {
    const answers = Array<Answer>(13).fill(0);
    expect(liveNails(answers)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(scores(answers)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('scores and finalNails', () => {
  it('sums the two answers per letter', () => {
    const answers: Answer[] = [1, 1, 0.5, 0, 0, 0, 1, 0.5, 0.5, 0.5, 1, 0];
    expect(scores(answers)).toEqual([2, 0.5, 0, 1.5, 1, 1]);
  });

  it.each([
    [0, 0],
    [0.5, 1],
    [1, 1],
    [1.5, 3],
    [2, 4],
  ])('score %s → %s nails', (score, nails) => {
    expect(finalNails([score])).toEqual([nails]);
  });
});

describe('classify', () => {
  it('all yes → flagship', () => {
    expect(classify(finalNails([2, 2, 2, 2, 2, 2])).id).toBe('flagship');
  });

  it('П and О zero, the rest ≥ 0.5 → beda-po, checked before the others', () => {
    expect(classify(finalNails([0, 0, 0.5, 2, 2, 2])).id).toBe('beda-po');
    expect(classify(finalNails([0, 0, 2, 2, 2, 2])).id).toBe('beda-po');
  });

  it('П and О zero but another letter fell too → not beda-po', () => {
    expect(classify(finalNails([0, 0, 0, 2, 2, 2])).id).toBe('beda');
  });

  it('4 mounted → schooner', () => {
    expect(classify([4, 4, 4, 3, 1, 0]).id).toBe('schooner');
  });

  it('2 mounted → beda', () => {
    expect(classify([4, 3, 1, 1, 0, 0]).id).toBe('beda');
  });

  it('0 mounted → slipway', () => {
    expect(classify([1, 1, 1, 0, 0, 1]).id).toBe('slipway');
  });

  it('keeps the prototype copy', () => {
    expect(classify([1, 0, 1, 4, 4, 1]).text).toBe('ПО есть. Победы нет. Узнаёшь?');
  });
});

describe('pickActions', () => {
  it('takes up to three weakest letters, weakest first', () => {
    expect(pickActions([2, 0.5, 0, 1.5, 1, 2]).map((a) => a.letter)).toEqual(['Б', 'О', 'Д']);
  });

  it('takes fewer when fewer letters are weak', () => {
    expect(pickActions([2, 2, 2, 2, 1.5, 2]).map((a) => a.letter)).toEqual(['Д']);
  });

  it('falls back to О, Д, Б when everything is nailed', () => {
    const acts = pickActions([2, 2, 2, 2, 2, 2]);
    expect(acts.map((a) => a.letter)).toEqual(['О', 'Д', 'Б']);
    expect(acts[0]).toMatchObject({ time: '30 минут', title: 'Найди трёх человек' });
  });
});
