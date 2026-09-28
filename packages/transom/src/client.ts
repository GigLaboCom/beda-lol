import { isBreakKey, type Op } from '@beda/core';
import { NAIL_OFF, UNITS_PER_EM } from './geometry';
import {
  type BoardState,
  finalOf,
  fromNails,
  type SlotState,
  slotLook,
  type TransomLabelText,
  transomLabel,
} from './state';
import { TIMELINE } from './timeline';

export interface SetOptions {
  /** Animate the change (default true). `false` jumps to the state instantly. */
  animate?: boolean;
}

export interface PlayOptions {
  /** Speed factor: 1 normal, 2.5 slow. */
  k?: number;
  onDone?: () => void;
}

export interface TransomController {
  readonly letters: readonly string[];
  /** Current nails per slot. */
  readonly nails: readonly number[];
  readonly state: BoardState;
  /** Go to a state (or nails per slot, for the quiz). */
  set(next: BoardState | readonly number[], options?: SetOptions): void;
  /** Play the ops from a fresh board with the doc-09 timeline; reduced motion jumps to the end. */
  play(ops: readonly Op[], options?: PlayOptions): void;
  /** Every nail back in, nothing broken, timers cleared. */
  reset(): void;
  /** The end of the last `play` (or of `ops`), without motion. */
  finalState(ops?: readonly Op[]): void;
  /** Dev only: show the hinge, plumb line, centroid and pieces (needs `debug` at render). */
  debug(on: boolean): void;
  /** Clear timers; the markup stays as it is. */
  destroy(): void;
}

interface Slot {
  wrappers: SVGGElement[];
  nails: SVGElement[];
  fixed: boolean;
}

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Takes over transom markup rendered by `renderTransom` (no rebuild) and
 * animates state changes: nails pop, a letter swings onto its hinge, falls
 * onto the shelf, a piece cracks and drops. Per-slot values come from the
 * markup's `data-v` and go in through CSSOM; durations come from `TIMELINE`.
 */
export function attachTransom(root: Element, labelText?: TransomLabelText): TransomController {
  const svg = root.matches('.transom') ? root : root.querySelector('.transom');
  if (!(svg instanceof SVGElement)) throw new Error('attachTransom: no .transom element inside');
  const board = svg as SVGSVGElement;

  const words: TransomLabelText = labelText ?? {
    prefix: board.dataset.labelPrefix,
    empty: board.dataset.labelEmpty,
  };
  const letters = Array.from(board.dataset.text ?? '');
  const slots: (Slot | null)[] = letters.map((_, i) => {
    const wrappers = Array.from(board.querySelectorAll<SVGGElement>(`.slot.i${i}`));
    if (!wrappers.length) return null;
    const main = wrappers.find((w) => w.parentElement?.classList.contains('layer-main'));
    const vars = main?.dataset.v ?? '';
    for (const pair of vars.split(';')) {
      const [name, value] = pair.split(':');
      if (name && value) for (const w of wrappers) w.style.setProperty(`--${name}`, value);
    }
    return {
      wrappers,
      nails: Array.from(board.querySelectorAll<SVGElement>(`.layer-nail .slot.i${i} .nail`)),
      fixed: main?.dataset.fixed !== undefined,
    };
  });
  const breaks = letters.map((_, i) => {
    const key = slots[i]?.wrappers[0]?.dataset.b ?? '';
    return isBreakKey(key) ? key : undefined;
  });
  const has = (s: Slot | null, cls: string) => !!s?.wrappers[0]?.classList.contains(cls);
  let state: BoardState = {
    letters,
    breaks,
    slots: slots.map((s): SlotState => {
      if (!s || s.fixed) return { nails: 4, broken: false };
      return {
        nails: s.nails.filter((n) => !n.classList.contains('off')).length,
        broken: has(s, 'broken'),
      };
    }),
  };

  for (const [name, ms] of Object.entries({
    swing: TIMELINE.swing,
    fall: TIMELINE.fall,
    pop: TIMELINE.nailPop,
    crack: TIMELINE.crack,
    pdrop: TIMELINE.pieceDrop,
    settle: TIMELINE.settle,
  })) {
    board.style.setProperty(`--t-${name}`, `${ms}ms`);
  }
  const u = (n: number) => `${Math.round(n * UNITS_PER_EM)}px`;
  board.style.setProperty('--nail-off', `translate(${u(NAIL_OFF[0])}, ${u(NAIL_OFF[1])})`);
  board.classList.add('live');
  for (const s of slots) {
    s?.wrappers.forEach((w) => {
      w.addEventListener('animationend', () => w.classList.remove('swinging'));
    });
  }

  let timers: ReturnType<typeof setTimeout>[] = [];
  let lastOps: readonly Op[] = [];
  const clear = () => {
    for (const t of timers) clearTimeout(t);
    timers = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.push(
      setTimeout(() => {
        // The board left the page (e.g. the namer re-rendered): stop, don't leak.
        if (!board.isConnected) return clear();
        fn();
      }, ms),
    );
  };
  const each = (s: Slot, fn: (w: SVGGElement) => void) => s.wrappers.forEach(fn);
  const label = () => board.setAttribute('aria-label', transomLabel(state, words));

  function setMotion(animated: boolean) {
    board.classList.toggle('still', !animated);
  }

  function applySlot(i: number, next: SlotState, animated: boolean) {
    const s = slots[i];
    if (!s || s.fixed) return;
    const count = Math.max(0, Math.min(4, next.nails));
    s.nails.forEach((n, k) => {
      n.classList.toggle('off', k >= count);
    });
    const look = slotLook(count);
    const wasHanging = has(s, 'hang');
    const broken = next.broken && !!breaks[i];
    each(s, (w) => {
      w.classList.toggle('hang', look === 'hang');
      w.classList.toggle('fall', look === 'fall');
      w.classList.toggle('broken', broken);
      if (look === 'hang' && !wasHanging && animated) {
        // Restart the swing: drop the class, force a reflow, add it back.
        w.classList.remove('swinging');
        void w.getBoundingClientRect();
        w.classList.add('swinging');
      } else if (look !== 'hang') {
        w.classList.remove('swinging', 'crack');
      }
    });
    const slotsNow = state.slots.slice();
    slotsNow[i] = { nails: count, broken };
    state = { ...state, slots: slotsNow };
  }

  function set(next: BoardState | readonly number[], { animate = true }: SetOptions = {}) {
    const target = Array.isArray(next)
      ? fromNails(letters, next as readonly number[])
      : (next as BoardState);
    const animated = animate && !reducedMotion();
    setMotion(animated);
    letters.forEach((_, i) => {
      applySlot(i, target.slots[i] ?? { nails: 4, broken: false }, animated);
    });
    label();
  }

  function reset() {
    clear();
    setMotion(false);
    for (const s of slots) s && each(s, (w) => w.classList.remove('crack', 'swinging'));
    set(fromNails(letters), { animate: false });
  }

  function finalState(ops: readonly Op[] = lastOps) {
    reset();
    set(finalOf(state, ops), { animate: false });
  }

  function play(ops: readonly Op[], { k = 1, onDone }: PlayOptions = {}) {
    lastOps = ops;
    reset();
    if (reducedMotion()) {
      finalState(ops);
      onDone?.();
      return;
    }
    board.style.setProperty('--k', String(k));
    // Let the reset paint before motion starts.
    void board.getBoundingClientRect();
    setMotion(true);
    let t = TIMELINE.lead;
    let end = 0;
    for (const op of ops) {
      const s = slots[op.i];
      if (!s || s.fixed) continue;
      const t0 = t;
      if ('fall' in op) {
        // Nails 3, 2, 1 pop one by one; the letter only lets go at `hangAt`.
        [3, 2, 1].forEach((n, j) => {
          later((t0 + (TIMELINE.nailPops[j] ?? 0)) * k, () => s.nails[n]?.classList.add('off'));
        });
        later((t0 + TIMELINE.hangAt) * k, () => {
          applySlot(op.i, { nails: 1, broken: state.slots[op.i]?.broken ?? false }, true);
        });
        later((t0 + TIMELINE.fallAt) * k, () => {
          applySlot(op.i, { nails: 0, broken: state.slots[op.i]?.broken ?? false }, true);
        });
        end = Math.max(end, t0 + TIMELINE.fallAt + TIMELINE.fall);
      } else if (breaks[op.i] === op.brk) {
        later(t0 * k, () => each(s, (w) => w.classList.add('crack')));
        later((t0 + TIMELINE.pieceDropAt) * k, () => {
          each(s, (w) => w.classList.remove('crack'));
          applySlot(op.i, { nails: state.slots[op.i]?.nails ?? 4, broken: true }, true);
        });
        end = Math.max(end, t0 + TIMELINE.pieceDropAt + TIMELINE.pieceDrop);
      }
      t += TIMELINE.opGap;
    }
    later(end * k, () => {
      label();
      onDone?.();
    });
  }

  return {
    letters,
    get nails() {
      return state.slots.map((s) => s.nails);
    },
    get state() {
      return state;
    },
    set,
    play,
    reset,
    finalState,
    debug(on: boolean) {
      board.classList.toggle('debug', on);
    },
    destroy: clear,
  };
}
