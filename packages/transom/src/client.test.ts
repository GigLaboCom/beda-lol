import { describe, expect, it } from 'vitest';
import { attachTransom } from './client';
import { renderTransom } from './render';

const WORD = ['П', 'О', 'Б', 'Е', 'Д', 'А'];

function mount(nails?: number[]) {
  const host = document.createElement('div');
  host.innerHTML = renderTransom({ letters: WORD, nails });
  document.body.append(host);
  const root = host.firstElementChild as HTMLElement;
  return { root, board: root.querySelector('.transom') as HTMLElement, tr: attachTransom(root) };
}

describe('attachTransom', () => {
  it('reads letters and nails from the markup', () => {
    const { tr } = mount([1, 0, 4, 4, 4, 4]);
    expect(tr.letters).toEqual(WORD);
    expect(tr.nails).toEqual([1, 0, 4, 4, 4, 4]);
  });

  it('toggles classes and nails', () => {
    const { board, tr } = mount();
    tr.set([1, 0, 4, 3, 4, 4]);
    const slots = board.querySelectorAll('.slot');
    expect(slots[0]?.classList.contains('hang')).toBe(true);
    expect(slots[0]?.classList.contains('swinging')).toBe(true);
    expect(slots[1]?.classList.contains('fall')).toBe(true);
    expect(slots[0]?.querySelectorAll('.nail.off')).toHaveLength(3);
    expect(slots[3]?.querySelectorAll('.nail.off')).toHaveLength(1);
    expect(board.classList.contains('still')).toBe(false);
    expect(board.getAttribute('aria-label')).toBe('Надпись на транце: П пусто БЕДА');

    tr.set([4, 4, 4, 4, 4, 4]);
    expect(board.querySelectorAll('.hang, .fall, .swinging')).toHaveLength(0);
    expect(board.querySelectorAll('.nail.off')).toHaveLength(0);
  });

  it('animate: false adds .still and does not swing', () => {
    const { board, tr } = mount();
    tr.set([1, 4, 4, 4, 4, 4], { animate: false });
    expect(board.classList.contains('still')).toBe(true);
    expect(board.querySelector('.slot')?.classList.contains('hang')).toBe(true);
    expect(board.querySelector('.swinging')).toBeNull();
  });

  it('accepts the .transom element itself', () => {
    const { board } = mount();
    expect(attachTransom(board).letters).toHaveLength(6);
  });

  it('throws without a board', () => {
    expect(() => attachTransom(document.createElement('div'))).toThrow();
  });
});
