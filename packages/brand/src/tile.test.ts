import { describe, expect, it } from 'vitest';
import { maskableTile, monoMark, parseTile, roundedTile, squareTile, svgDocument } from './tile';

const SOURCE = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" xmlns:x="urn:x"><metadata><x:m>signed</x:m></metadata><!-- note --><title>Т</title><rect width="24" height="24" rx="5" fill="#111"/><g fill="none" stroke="#abc"><path d="M1 1"/></g><circle fill="#f00" r="1"/></svg>`;

describe('parseTile', () => {
  const tile = parseTile(SOURCE);

  it('splits the background from the mark and drops metadata', () => {
    expect(tile).toEqual({
      size: 24,
      title: 'Т',
      backgroundAttrs: 'width="24" height="24" rx="5" fill="#111"',
      fill: '#111',
      mark: '<g fill="none" stroke="#abc"><path d="M1 1"/></g><circle fill="#f00" r="1"/>',
    });
  });

  it('rejects a source without a full-size background rect', () => {
    expect(() => parseTile('<svg viewBox="0 0 24 24"><circle r="1"/></svg>')).toThrow(
      /first element/,
    );
    expect(() =>
      parseTile('<svg viewBox="0 0 24 24"><rect width="20" height="24" fill="#000"/></svg>'),
    ).toThrow(/whole viewBox/);
  });

  it('rejects a non-square viewBox', () => {
    expect(() => parseTile('<svg viewBox="0 0 24 20"><rect/></svg>')).toThrow(/square/);
  });

  it('renders documents with an optional pixel size', () => {
    const doc = svgDocument(tile, roundedTile(tile), 32);
    expect(doc).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 24 24" width="32" height="32"><title>Т<\/title><rect /,
    );
    expect(doc).not.toContain('metadata');
  });

  it('squares the corners for full-bleed variants', () => {
    expect(squareTile(tile)).toMatch(/^<rect width="24" height="24" fill="#111"\/>/);
    expect(maskableTile(tile, 0.5)).toContain(
      '<g transform="translate(12 12) scale(0.5) translate(-12 -12)">',
    );
    expect(maskableTile(tile)).not.toContain('rx=');
  });

  it('paints the mono mark solid black and keeps fill="none"', () => {
    expect(monoMark(tile)).toBe(
      '<g fill="none" stroke="#000"><path d="M1 1"/></g><circle fill="#000" r="1"/>',
    );
  });
});
