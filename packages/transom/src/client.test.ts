import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachTransom } from './client';
import { renderTransom } from './render';
import { fromOps } from './state';
import { TIMELINE } from './timeline';

const WORD = ['П', 'О', 'Б', 'Е', 'Д', 'А'];

function mount(html: string) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const root = host.firstElementChild as HTMLElement;
  const svg = root.querySelector('svg') as SVGSVGElement;
  return { host, root, svg, tr: attachTransom(root) };
}

const slot = (svg: Element, layer: string, i: number) =>
  svg.querySelector(`.layer-${layer} > .slot.i${i}`) as SVGGElement;

let reduce = false;
beforeEach(() => {
  reduce = false;
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce') }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('attachTransom', () => {
  it('reads letters and nails from the markup and goes live', () => {
    const { tr, svg } = mount(renderTransom({ letters: WORD, nails: [1, 0, 4, 4, 4, 4] }));
    expect(tr.letters).toEqual(WORD);
    expect(tr.nails).toEqual([1, 0, 4, 4, 4, 4]);
    expect(svg.classList.contains('live')).toBe(true);
    expect(svg.style.getPropertyValue('--t-swing')).toBe(`${TIMELINE.swing}ms`);
  });

  it('sets per-slot values from data-v on every wrapper of the slot (CSSOM, no attributes)', () => {
    const { svg } = mount(renderTransom({ letters: WORD }));
    for (const layer of ['ghost', 'hole', 'main', 'nail']) {
      expect(slot(svg, layer, 0).style.getPropertyValue('--hang')).toMatch(/^47\.\ddeg$/);
    }
  });

  it('set(nails) toggles classes and nails, with the swing when a letter starts hanging', () => {
    const { svg, tr } = mount(renderTransom({ letters: WORD }));
    tr.set([1, 0, 4, 3, 4, 4]);
    expect(slot(svg, 'main', 0).classList.contains('hang')).toBe(true);
    expect(slot(svg, 'main', 0).classList.contains('swinging')).toBe(true);
    expect(slot(svg, 'nail', 0).classList.contains('hang')).toBe(true);
    expect(slot(svg, 'main', 1).classList.contains('fall')).toBe(true);
    expect(slot(svg, 'nail', 0).querySelectorAll('.nail.off')).toHaveLength(3);
    expect(slot(svg, 'nail', 3).querySelectorAll('.nail.off')).toHaveLength(1);
    expect(svg.classList.contains('still')).toBe(false);
    expect(svg.getAttribute('aria-label')).toBe('Надпись на транце: П пусто БЕДА');

    tr.set([4, 4, 4, 4, 4, 4]);
    expect(svg.querySelectorAll('.hang, .fall, .swinging')).toHaveLength(0);
    expect(svg.querySelectorAll('.nail.off')).toHaveLength(0);
  });

  it('animate: false adds .still and does not swing', () => {
    const { svg, tr } = mount(renderTransom({ letters: WORD }));
    tr.set([1, 4, 4, 4, 4, 4], { animate: false });
    expect(svg.classList.contains('still')).toBe(true);
    expect(slot(svg, 'main', 0).classList.contains('hang')).toBe(true);
    expect(svg.querySelector('.swinging')).toBeNull();
  });

  it('play() runs the doc-09 timeline: nails, hang, fall, crack, piece drop', () => {
    vi.useFakeTimers();
    const ops = [
      { i: 0, brk: 'Д>Л' as const },
      { i: 4, fall: true as const },
    ];
    const state = fromOps('ДЕНЬГИ', ops);
    const { svg, tr } = mount(renderTransom({ state }));
    const done = vi.fn();
    tr.play(ops, { onDone: done });
    const t0 = TIMELINE.lead;
    const t1 = t0 + TIMELINE.opGap;

    vi.advanceTimersByTime(t0 + 1);
    expect(slot(svg, 'piece', 0).classList.contains('crack')).toBe(true);
    vi.advanceTimersByTime(TIMELINE.pieceDropAt);
    expect(slot(svg, 'piece', 0).classList.contains('broken')).toBe(true);
    expect(slot(svg, 'piece', 0).classList.contains('crack')).toBe(false);

    vi.advanceTimersByTime(t1 + (TIMELINE.nailPops[2] ?? 0) - (t0 + 1 + TIMELINE.pieceDropAt) + 1);
    expect(slot(svg, 'nail', 4).querySelectorAll('.nail.off')).toHaveLength(3);
    expect(slot(svg, 'main', 4).classList.contains('hang')).toBe(false);
    vi.advanceTimersByTime(TIMELINE.hangAt);
    expect(slot(svg, 'main', 4).classList.contains('hang')).toBe(true);
    vi.advanceTimersByTime(TIMELINE.swing);
    expect(slot(svg, 'main', 4).classList.contains('fall')).toBe(true);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TIMELINE.fall);
    expect(done).toHaveBeenCalledOnce();
    expect(svg.getAttribute('aria-label')).toBe('Надпись на транце: ЛЕНЬ пусто И');
  });

  it('play() under reduced motion jumps to the final state', () => {
    reduce = true;
    const ops = [
      { i: 0, fall: true as const },
      { i: 1, fall: true as const },
    ];
    const { svg, tr } = mount(renderTransom({ letters: WORD }));
    const done = vi.fn();
    tr.play(ops, { onDone: done });
    expect(done).toHaveBeenCalledOnce();
    expect(tr.nails).toEqual([0, 0, 4, 4, 4, 4]);
    expect(svg.classList.contains('still')).toBe(true);
  });

  it('reset() clears pending timers', () => {
    vi.useFakeTimers();
    const { svg, tr } = mount(renderTransom({ letters: WORD }));
    tr.play([{ i: 0, fall: true }]);
    tr.reset();
    vi.advanceTimersByTime(10_000);
    expect(svg.querySelectorAll('.hang, .fall, .nail.off')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops when the board leaves the page', () => {
    vi.useFakeTimers();
    const { host, tr } = mount(renderTransom({ letters: WORD }));
    tr.play([
      { i: 0, fall: true },
      { i: 1, fall: true },
    ]);
    host.remove();
    vi.advanceTimersByTime(TIMELINE.lead + 1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finalState() shows the end of the last play without motion', () => {
    vi.useFakeTimers();
    const { tr } = mount(renderTransom({ letters: WORD }));
    tr.play([{ i: 1, fall: true }]);
    tr.finalState();
    expect(tr.nails).toEqual([4, 0, 4, 4, 4, 4]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps fixed glyphs nailed on', () => {
    const { tr } = mount(renderTransom({ letters: ['A', '!'] }));
    tr.set([0, 0], { animate: false });
    expect(tr.nails).toEqual([0, 4]);
  });

  it('accepts the svg element itself and throws without a board', () => {
    const { svg } = mount(renderTransom({ letters: WORD }));
    expect(attachTransom(svg).letters).toHaveLength(6);
    expect(() => attachTransom(document.createElement('div'))).toThrow();
  });
});
