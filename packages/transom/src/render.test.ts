import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTokens } from '@beda/tokens/read';
import { describe, expect, it } from 'vitest';
import { boardWidthEm, CLASS_TOKENS, fitSize, renderTransom } from './render';

const WORD = ['П', 'О', 'Б', 'Е', 'Д', 'А'];

function dom(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

const layer = (host: HTMLElement, name: string) =>
  Array.from(host.querySelectorAll(`.layer-${name} > .slot`));

describe('renderTransom', () => {
  it('renders six slots and 24 nails for ПОБЕДА', () => {
    const host = dom(renderTransom({ letters: WORD }));
    expect(layer(host, 'main')).toHaveLength(6);
    expect(host.querySelectorAll('.nail')).toHaveLength(24);
    expect(host.querySelectorAll('.hole')).toHaveLength(24);
    expect(host.querySelectorAll('.nail.off')).toHaveLength(0);
    expect(host.querySelectorAll('defs > path')).toHaveLength(6);
  });

  it('paints board-wide layers in order: imprints, holes, letters, pieces, nails', () => {
    const host = dom(renderTransom({ letters: ['Д', 'А'], breaks: ['Д>Л'] }));
    const names = Array.from(host.querySelectorAll('svg > .layer')).map((l) =>
      l.classList[1]?.slice(6),
    );
    expect(names).toEqual(['ghost', 'hole', 'main', 'piece', 'nail']);
  });

  it('applies hang on 1 nail and fall on 0, with the final transform as an attribute', () => {
    const host = dom(renderTransom({ letters: WORD, nails: [1, 0, 4, 3, 2, 4] }));
    const main = layer(host, 'main');
    expect(main[0]?.classList.contains('hang')).toBe(true);
    expect(main[1]?.classList.contains('fall')).toBe(true);
    expect(main[2]?.getAttribute('class')).toBe('slot i2');
    expect(main[0]?.querySelector('.main')?.getAttribute('transform')).toMatch(
      /^rotate\(47\.\d\)$/,
    );
    expect(main[1]?.querySelector('.main')?.getAttribute('transform')).toMatch(/^translate\(/);
    const nails = layer(host, 'nail');
    expect(nails[0]?.querySelectorAll('.nail.off')).toHaveLength(3);
    expect(nails[1]?.querySelectorAll('.nail.off')).toHaveLength(4);
    expect(nails[3]?.querySelectorAll('.nail.off')).toHaveLength(1);
    // State classes go on every wrapper of a slot.
    expect(layer(host, 'nail')[0]?.classList.contains('hang')).toBe(true);
    expect(layer(host, 'ghost')[1]?.classList.contains('fall')).toBe(true);
  });

  it('carries the per-slot CSS values in data-v and no style attributes', () => {
    const html = renderTransom({ letters: WORD });
    const v = dom(html).querySelector('.layer-main .slot.i0')?.getAttribute('data-v');
    expect(v).toMatch(/^hang:47\.\ddeg;drop:\d+px;fx:-?\d+px;fr:-?\d+deg$/);
    expect(html).not.toContain('style=');
  });

  it('renders a break: the remainder clipped, the piece on its own layer', () => {
    const host = dom(renderTransom({ letters: ['Д', 'А'], breaks: ['Д>Л'] }));
    expect(host.querySelectorAll('clipPath[id$="k0"] path[clip-rule="evenodd"]')).toHaveLength(1);
    expect(layer(host, 'piece')).toHaveLength(1);
    expect(layer(host, 'main')[0]?.getAttribute('data-b')).toBe('Д>Л');
    expect(layer(host, 'main')[0]?.getAttribute('data-v')).toContain('pdrop:');
    expect(layer(host, 'piece')[0]?.querySelector('.piece')?.getAttribute('transform')).toBeNull();
    const broken = dom(renderTransom({ letters: ['Д'], breaks: ['Д>Л'], broken: [true] }));
    expect(layer(broken, 'piece')[0]?.classList.contains('broken')).toBe(true);
    expect(broken.querySelector('.piece')?.getAttribute('transform')).toMatch(/^translate\(/);
  });

  it('ignores a break the letter cannot take', () => {
    const host = dom(renderTransom({ letters: ['А'], breaks: ['Д>Л'] }));
    expect(layer(host, 'piece')).toHaveLength(0);
    expect(layer(host, 'main')[0]?.hasAttribute('data-b')).toBe(false);
  });

  it('keeps punctuation nailed on', () => {
    const host = dom(renderTransom({ letters: ['A', '.'], nails: [0, 0] }));
    const dot = layer(host, 'main')[1];
    expect(dot?.classList.contains('fall')).toBe(false);
    expect(dot?.hasAttribute('data-fixed')).toBe(true);
    expect(layer(host, 'nail')[1]?.querySelectorAll('.nail:not(.off)')).toHaveLength(1);
  });

  it('renders a narrow space and skips characters it cannot draw', () => {
    const host = dom(renderTransom({ letters: ['Т', 'А', ' ', 'Б', '🚀'] }));
    expect(layer(host, 'main')).toHaveLength(3);
    expect(host.querySelectorAll('.nail')).toHaveLength(12);
    expect(host.querySelector('svg')?.getAttribute('data-text')).toBe('ТА Б🚀');
  });

  it('labels the board for screen readers', () => {
    const host = dom(renderTransom({ letters: WORD, nails: [0, 0, 4, 4, 4, 4] }));
    const svg = host.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Надпись на транце: пусто пусто БЕДА');
    const brk = dom(renderTransom({ letters: ['Д', 'А'], breaks: ['Д>Л'], broken: [true] }));
    expect(brk.querySelector('svg')?.getAttribute('aria-label')).toBe('Надпись на транце: ЛА');
  });

  it('prefixes ids per board', () => {
    const a = renderTransom({ letters: ['Д'], breaks: ['Д>Л'], id: 'hero' });
    expect(a).toContain('id="hero-g1044"');
    expect(a).toContain('url(#hero-k0)');
    expect(renderTransom({ letters: ['Д'], idPrefix: 'x-' })).toContain('id="x-g1044"');
  });

  it('escapes the label and id', () => {
    const html = renderTransom({ letters: ['<', '"'], id: 'x"y', label: '<b>' });
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;');
    expect(html).toContain('&quot;');
    expect(html).toContain('id="x&quot;y"');
  });

  it('dims every letter but the highlighted one', () => {
    const host = dom(renderTransom({ letters: WORD, highlight: 2 }));
    expect(layer(host, 'main').filter((s) => s.classList.contains('dim'))).toHaveLength(5);
    expect(layer(host, 'main')[2]?.classList.contains('dim')).toBe(false);
  });

  it('sizes the SVG in em from glyph advances', () => {
    const svg = dom(renderTransom({ letters: WORD })).querySelector('svg');
    const w = Number.parseFloat(svg?.getAttribute('width') ?? '');
    expect(w).toBeCloseTo(boardWidthEm(WORD), 3);
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${Math.round(w * 1000)} 3100`);
  });

  it('renders the debug overlay only when asked', () => {
    expect(renderTransom({ letters: WORD })).not.toContain('d-plumb');
    expect(renderTransom({ letters: WORD, debug: true })).toContain('d-plumb');
  });
});

describe('fitSize', () => {
  it('fits the board into the available width, clamped', () => {
    const w = boardWidthEm(WORD);
    expect(fitSize(WORD, 40 * w)).toBe(40);
    expect(fitSize(WORD, 10)).toBe(20);
    expect(fitSize(WORD, 1e6)).toBe(64);
    expect(fitSize(WORD, 1e6, { max: 100 })).toBe(100);
  });

  it('gives a long name a smaller size', () => {
    const long = Array.from('BUG TRACKER PRO');
    expect(fitSize(long, 360)).toBeLessThan(fitSize(WORD, 360));
  });
});

describe('standalone SVG', () => {
  const palette = readTokens();

  it('is a self-contained svg with the palette in a style block', () => {
    const svg = renderTransom({ letters: WORD, standalone: { palette } });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`.t-brass{fill:${palette.brass}}`);
    expect(svg).not.toContain('var(--');
    expect(svg).not.toContain('transom-wrap');
  });

  it('fails loudly on a missing colour', () => {
    expect(() => renderTransom({ letters: WORD, standalone: { palette: {} } })).toThrow(/--plank/);
  });

  it('maps the same classes to the same tokens as transom.css', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'transom.css'), 'utf8');
    for (const [cls, token] of Object.entries(CLASS_TOKENS)) {
      const rule = new RegExp(`\\.transom \\.${cls}(,[^{]*)?\\s*\\{\\s*fill: var\\(--${token}\\);`);
      const shared = new RegExp(
        `\\.transom \\.${cls},\\s*\\n\\.transom \\.[a-z-]+ \\{\\s*fill: var\\(--${token}\\);`,
      );
      expect(rule.test(css) || shared.test(css), `${cls} → --${token}`).toBe(true);
    }
  });
});
