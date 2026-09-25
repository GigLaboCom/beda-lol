import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allCodes, decode, encode, isValidCode, nailsToStates, statesToNails } from './result-code';

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/result-codes.json', import.meta.url), 'utf8'),
) as { valid: string[]; invalid: string[] };

describe('result code', () => {
  it('maps nails to states: ≥2 → 2, 1 → 1, 0 → 0', () => {
    expect(nailsToStates([4, 3, 2, 1, 0, 4])).toEqual([2, 2, 2, 1, 0, 2]);
    expect(statesToNails([2, 1, 0, 2, 2, 2])).toEqual([4, 1, 0, 4, 4, 4]);
  });

  it('encodes six states', () => {
    expect(encode([0, 0, 2, 2, 1, 2])).toBe('002212');
    expect(() => encode([0, 0, 2])).toThrow(RangeError);
  });

  it('round-trips all 729 codes', () => {
    const codes = allCodes();
    expect(codes).toHaveLength(729);
    expect(new Set(codes).size).toBe(729);
    expect(codes[0]).toBe('000000');
    expect(codes.at(-1)).toBe('222222');
    for (const code of codes) {
      const states = decode(code);
      expect(states).not.toBeNull();
      expect(encode(states ?? [])).toBe(code);
    }
  });

  it.each(['00221', '003212', 'abcdef'])('rejects %j', (code) => {
    expect(decode(code)).toBeNull();
  });

  it('agrees with the shared fixture', () => {
    for (const code of fixture.valid) expect(isValidCode(code), code).toBe(true);
    for (const code of fixture.invalid) expect(isValidCode(code), code).toBe(false);
  });
});
