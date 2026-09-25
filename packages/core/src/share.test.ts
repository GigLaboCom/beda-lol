import { describe, expect, it } from 'vitest';
import { shareText, shownWord } from './share';

describe('share', () => {
  it('shows fallen letters as underscores', () => {
    expect(shownWord([0, 0, 2, 2, 1, 2])).toBe('__БЕДА');
  });

  it('builds the share text', () => {
    expect(shareText([0, 0, 2, 2, 2, 2])).toBe('Прошёл осмотр судна: у меня __БЕДА. А у тебя?');
  });
});
