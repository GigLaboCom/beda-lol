import { describe, expect, it } from 'vitest';
import { getBoardWord } from './board';
import { applyOps, validateOps } from './breaks';
import { WORD } from './letters';

describe('getBoardWord', () => {
  it('is ПОБЕДА → БЕДА in Russian', () => {
    const b = getBoardWord('ru');
    expect(b.letters).toEqual(WORD);
    expect(b.result).toBe('БЕДА');
    expect(b.story?.length).toBeGreaterThan(0);
  });

  it.each(['ru', 'en'] as const)('%s: the ops are valid and yield the result', (locale) => {
    const b = getBoardWord(locale);
    const text = b.letters.join('');
    expect(validateOps(text, b.ops)).toEqual([]);
    expect(applyOps(text, b.ops)).toBe(b.result);
  });

  it('shows an English pun on /en (D2, provisional)', () => {
    const b = getBoardWord('en');
    expect(b.letters.join('')).toBe('PROOF');
    expect(b.result).toBe('OOF');
    expect(b.story).toBeUndefined();
  });
});
