import { slotState, transomLabel } from './state';

export interface SetOptions {
  /** Animate the change (default true). `false` jumps to the state instantly. */
  animate?: boolean;
}

export interface TransomController {
  readonly letters: readonly string[];
  /** Current nails per slot. */
  readonly nails: readonly number[];
  set(nails: readonly number[], options?: SetOptions): void;
}

interface Slot {
  el: HTMLElement;
  nails: HTMLElement[];
}

/**
 * Takes over transom markup rendered by `renderTransom` (no rebuild) and
 * applies state changes with the prototype's motion: nails drop, a letter
 * swings when it starts hanging, falls onto the shelf at zero.
 */
export function attachTransom(root: HTMLElement): TransomController {
  const board = root.matches('.transom') ? root : root.querySelector<HTMLElement>('.transom');
  if (!board) throw new Error('attachTransom: no .transom element inside the root');

  const letters: string[] = [];
  const slots: (Slot | null)[] = [];
  const current: number[] = [];
  for (const el of Array.from(board.querySelectorAll<HTMLElement>(':scope > .slot'))) {
    if (el.classList.contains('space')) {
      letters.push(' ');
      slots.push(null);
      current.push(0);
      continue;
    }
    const nails = Array.from(el.querySelectorAll<HTMLElement>('.nail'));
    letters.push(el.dataset.letter ?? el.querySelector('.g')?.textContent ?? '');
    slots.push({ el, nails });
    current.push(nails.filter((n) => !n.classList.contains('off')).length);
    el.addEventListener('animationend', () => el.classList.remove('swinging'));
  }

  const reducedMotion = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function set(nails: readonly number[], { animate = true }: SetOptions = {}): void {
    const animated = animate && !reducedMotion();
    if (animated) board?.classList.remove('still');
    else board?.classList.add('still');

    slots.forEach((slot, i) => {
      if (!slot) return;
      const count = Math.max(0, Math.min(4, nails[i] ?? 4));
      current[i] = count;
      slot.nails.forEach((n, k) => {
        n.classList.toggle('off', k >= count);
      });
      const state = slotState(count);
      const wasHanging = slot.el.classList.contains('hang');
      slot.el.classList.toggle('hang', state === 'hang');
      slot.el.classList.toggle('fall', state === 'fall');
      if (state === 'hang' && !wasHanging && animated) {
        // Restart the swing: drop the class, force a reflow, add it back.
        slot.el.classList.remove('swinging');
        void slot.el.offsetWidth;
        slot.el.classList.add('swinging');
      } else if (state !== 'hang') {
        slot.el.classList.remove('swinging');
      }
    });

    board?.setAttribute('aria-label', transomLabel(letters, current));
  }

  return {
    letters,
    get nails() {
      return current.slice();
    },
    set,
  };
}
