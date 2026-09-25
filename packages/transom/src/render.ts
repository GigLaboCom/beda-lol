import { MAX_SLOTS, mountFor, mountKey } from './mounts';
import { slotState, transomLabel } from './state';

export interface RenderOptions {
  /** One entry per slot; `' '` is a narrow empty slot. */
  letters: readonly string[];
  /** Nails per slot, 0..4. Missing entries count as 4. */
  nails?: readonly number[];
  /**
   * Letter size, any CSS length (sets `--ts` in a `style` attribute). Not
   * allowed under a strict CSP: prefer setting `--ts` from CSS or via CSSOM.
   */
  size?: string;
  /** Overrides the generated aria-label. */
  label?: string;
  /** id on the wrapper, for the client controller. */
  id?: string;
  /** Slot index to highlight; the other letters are dimmed. */
  highlight?: number;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/**
 * Server-side HTML for the transom with the state already applied: it looks
 * right without JavaScript. Same DOM as the prototype's `buildTransom` +
 * `setTransom`, so `attachTransom` can take it over.
 */
export function renderTransom({
  letters,
  nails = [],
  size,
  label,
  id,
  highlight,
}: RenderOptions): string {
  const counts = letters.map((_, i) => nails[i] ?? 4);
  const slots = letters.map((ch, i) => {
    if (ch === ' ') return '<div class="slot space"></div>';
    // Positions come from mounts.css (by `data-m` and the slot index class):
    // no inline styles, so the markup works under a strict CSP.
    const m = mountFor(ch);
    const count = counts[i] ?? 4;
    const state = slotState(count);
    const dim = highlight !== undefined && highlight !== i ? ' dim' : '';
    const index = Math.min(i, MAX_SLOTS - 1);
    const cls = `slot i${index}${state === 'on' ? '' : ` ${state}`}${dim}`;
    const safe = escapeHtml(ch);
    const fixings = m.pts
      .map((_, k) => {
        const off = k >= count ? ' off' : '';
        return `<i class="hole n${k}"></i><i class="nail n${k}${off}"></i>`;
      })
      .join('');
    return `<div class="${cls}" data-m="${mountKey(ch)}" data-letter="${safe}"><span class="ghost" aria-hidden="true">${safe}</span><span class="g" aria-hidden="true">${safe}</span>${fixings}</div>`;
  });
  const aria = escapeHtml(label ?? transomLabel(letters, counts));
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const sizeAttr = size ? ` style="--ts:${escapeHtml(size)}"` : '';
  return `<div class="transom-wrap"${idAttr}${sizeAttr} data-transom><div class="transom still" role="img" aria-label="${aria}">${slots.join('')}</div><div class="shelf"></div></div>`;
}
