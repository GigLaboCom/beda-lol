import { describe, expect, it } from 'vitest';
import { WORD } from './letters';
import { nailState, STEPS } from './tracker';

describe('tracker', () => {
  it('has four steps per letter', () => {
    for (const l of WORD) expect(STEPS[l]).toHaveLength(4);
  });

  it.each([
    [4, 'nailed', 'прибита'],
    [3, 'holding', '3 из 4'],
    [2, 'holding', '2 из 4'],
    [1, 'hanging', 'висит'],
    [0, 'fallen', 'на полке'],
  ])('%i nails → %s', (count, id, label) => {
    expect(nailState(count)).toMatchObject({ id, label });
  });
});
