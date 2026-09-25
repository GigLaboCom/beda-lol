import { describe, expect, it } from 'vitest';
import { renderTransom } from './render';

const WORD = ['П', 'О', 'Б', 'Е', 'Д', 'А'];

function dom(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('renderTransom', () => {
  it('renders six slots and 24 nails for ПОБЕДА', () => {
    const host = dom(renderTransom({ letters: WORD }));
    expect(host.querySelectorAll('.slot')).toHaveLength(6);
    expect(host.querySelectorAll('.nail')).toHaveLength(24);
    expect(host.querySelectorAll('.hole')).toHaveLength(24);
    expect(host.querySelectorAll('.nail.off')).toHaveLength(0);
  });

  it('applies hang on 1 nail and fall on 0', () => {
    const host = dom(renderTransom({ letters: WORD, nails: [1, 0, 4, 3, 2, 4] }));
    const slots = host.querySelectorAll('.slot');
    expect(slots[0]?.classList.contains('hang')).toBe(true);
    expect(slots[1]?.classList.contains('fall')).toBe(true);
    expect(slots[2]?.className).toBe('slot');
    expect(slots[0]?.querySelectorAll('.nail.off')).toHaveLength(3);
    expect(slots[1]?.querySelectorAll('.nail.off')).toHaveLength(4);
    expect(slots[3]?.querySelectorAll('.nail.off')).toHaveLength(1);
  });

  it('renders a narrow space slot', () => {
    const host = dom(renderTransom({ letters: ['Т', 'А', ' ', 'Б'] }));
    expect(host.querySelectorAll('.slot.space')).toHaveLength(1);
    expect(host.querySelectorAll('.nail')).toHaveLength(12);
  });

  it('labels the board for screen readers', () => {
    const host = dom(renderTransom({ letters: WORD, nails: [0, 0, 4, 4, 4, 4] }));
    const board = host.querySelector('.transom');
    expect(board?.getAttribute('role')).toBe('img');
    expect(board?.getAttribute('aria-label')).toBe('Надпись на транце: пусто пусто БЕДА');
    expect(host.querySelectorAll('[aria-hidden="true"]')).toHaveLength(12);
  });

  it('uses the О mount with its lower-left rivet as the hinge', () => {
    const host = dom(renderTransom({ letters: ['О'] }));
    const style = host.querySelector('.slot')?.getAttribute('style') ?? '';
    expect(style).toContain('--ox:0.09em');
    expect(style).toContain('--oy:0.72em');
    expect(style).toContain('--hang:124deg');
  });

  it('escapes letters, label and id', () => {
    const html = renderTransom({ letters: ['<', '"'], id: 'x"y', label: '<b>' });
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;');
    expect(html).toContain('&quot;');
    expect(html).toContain('id="x&quot;y"');
  });

  it('dims every letter but the highlighted one', () => {
    const host = dom(renderTransom({ letters: WORD, highlight: 2 }));
    expect(host.querySelectorAll('.slot.dim')).toHaveLength(5);
    expect(host.querySelectorAll('.slot')[2]?.classList.contains('dim')).toBe(false);
  });

  it('sets the size through --ts', () => {
    expect(renderTransom({ letters: WORD, size: '48px' })).toContain('style="--ts:48px"');
  });
});
