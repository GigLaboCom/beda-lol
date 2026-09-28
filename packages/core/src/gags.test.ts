import { describe, expect, it } from 'vitest';
import { applyOps, validateOps } from './breaks';
import { BOARD_CHARSET } from './charset.gen';
import {
  GAG_COPY_EN,
  GAG_COPY_RU,
  GAGS,
  gagById,
  gagsByLang,
  getGagCopy,
  pickGag,
  publicGags,
} from './gags';

describe('gags', () => {
  it.for(GAGS.map((g) => [g.text, g.result, g] as const))('%s → %s', ([, , g]) => {
    expect(validateOps(g.text, g.ops)).toEqual([]);
    expect(applyOps(g.text, g.ops)).toBe(g.result);
  });

  it('has the 30 catalogue gags (PEST LUNCH is rejected)', () => {
    expect(GAGS).toHaveLength(30);
    expect(gagsByLang('ru')).toHaveLength(15);
    expect(gagsByLang('en')).toHaveLength(15);
    expect(GAGS.map((g): string => g.result)).not.toContain('PEST LUNCH');
  });

  it('draws every character on the transom', () => {
    const drawable = new Set(Array.from(BOARD_CHARSET));
    for (const g of GAGS) {
      for (const ch of Array.from(g.text)) {
        if (ch !== ' ') expect(drawable.has(ch), `${g.id}: ${ch}`).toBe(true);
      }
    }
  });

  it('has unique slug ids and copy in both locales', () => {
    const ids = GAGS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      for (const copy of [GAG_COPY_RU[id], GAG_COPY_EN[id]]) {
        expect(copy.meta.length, id).toBeGreaterThan(0);
        expect(copy.joke.length, id).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(GAG_COPY_RU).sort()).toEqual([...ids].sort());
    expect(Object.keys(GAG_COPY_EN).sort()).toEqual([...ids].sort());
  });

  it('looks gags up by id and copy by locale', () => {
    expect(gagById('dengi')?.result).toBe('ЛЕНЬ');
    expect(gagById('nope')).toBeUndefined();
    expect(getGagCopy('dengi').joke).toBe(GAG_COPY_RU.dengi.joke);
    expect(getGagCopy('dengi', 'en').joke).toBe(GAG_COPY_EN.dengi.joke);
    expect(() => getGagCopy('nope')).toThrow();
  });
});

describe('public gags', () => {
  it('keeps the rude one off public pages', () => {
    expect(publicGags('ru').map((g) => g.id)).not.toContain('dohod');
    expect(publicGags('ru')).toHaveLength(14);
    expect(publicGags('en')).toHaveLength(15);
  });

  it('picks deterministically by key, from the language asked for', () => {
    expect(pickGag('/nope', 'ru')).toBe(pickGag('/nope', 'ru'));
    expect(pickGag('/nope', 'en').lang).toBe('en');
    const picks = new Set(Array.from({ length: 50 }, (_, i) => pickGag(`/p${i}`, 'ru').id));
    expect(picks.size).toBeGreaterThan(5);
    expect(picks.has('dohod')).toBe(false);
  });
});
