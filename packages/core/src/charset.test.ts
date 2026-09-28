import { describe, expect, it } from 'vitest';
import { canFall, LOOKALIKE, normalizeName } from './charset';
import { BOARD_CHARSET } from './charset.gen';

describe('normalizeName', () => {
  it.each([
    ['Node.js', 'NODE.JS', []],
    ['C++ & Rust', 'C++ & RUST', []],
    ['проект «Ёлка» — v2.0!', 'ПРОЕКТ «ЁЛКА» — V2.0!', []],
    ['l’Été', "L'ÉTÉ", []],
    ['Ｆｕｌｌ ｗｉｄｔｈ', 'FULL WIDTH', []],
    ['Pho Việt', 'PHO VIET', []],
    ['Қазақ Әлем', 'КАЗАК ƏЛЕМ', []],
    ['Rocket 🚀 launch', 'ROCKET LAUNCH', ['🚀']],
    ['straße', 'STRASSE', []],
    ['中文 app', 'APP', ['中', '文']],
    ['“Quotes” ‹x› – dash − minus', '"QUOTES" «X» — DASH - MINUS', []],
    ['  таск   менеджер  ', 'ТАСК МЕНЕДЖЕР', []],
  ])('%s → %s', (raw, name, removed) => {
    expect(normalizeName(raw)).toEqual({ name, removed });
  });

  it('removes a letter with no look-alike and no drawable base', () => {
    expect(normalizeName('Һ')).toEqual({ name: '', removed: ['Һ'] });
  });

  it('maps every look-alike to a drawable glyph', () => {
    const drawable = new Set(Array.from(BOARD_CHARSET));
    for (const to of Object.keys(LOOKALIKE)) expect(drawable.has(to), to).toBe(true);
  });

  it('lets letters and digits fall, and nothing else', () => {
    expect(canFall('Д')).toBe(true);
    expect(canFall('7')).toBe(true);
    expect(canFall('.')).toBe(false);
    expect(canFall(' ')).toBe(false);
  });
});
