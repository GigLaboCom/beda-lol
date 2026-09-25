import { fallRotation, fallX, mountFor } from './mounts';
import { slotState, transomLabel } from './state';

export interface RenderOptions {
  /** One entry per slot; `' '` is a narrow empty slot. */
  letters: readonly string[];
  /** Nails per slot, 0..4. Missing entries count as 4. */
  nails?: readonly number[];
  /** Letter size, any CSS length (sets `--ts`); defaults to the context's CSS. */
  size?: string;
  /** Overrides the generated aria-label. */
  label?: string;
  /** id on the wrapper, for the client controller. */
  id?: string;
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

const num = (n: number) => String(Number(n.toFixed(3)));

/**
 * Server-side HTML for the transom with the state already applied: it looks
 * right without JavaScript. Same DOM as the prototype's `buildTransom` +
 * `setTransom`, so `attachTransom` can take it over.
 */
export function renderTransom({ letters, nails = [], size, label, id }: RenderOptions): string {
  const counts = letters.map((_, i) => nails[i] ?? 4);
  const slots = letters.map((ch, i) => {
    if (ch === ' ') return '<div class="slot space"></div>';
    const m = mountFor(ch);
    const [ox, oy] = m.pts[0];
    const count = counts[i] ?? 4;
    const state = slotState(count);
    const style = [
      `--ox:${num(ox)}em`,
      `--oy:${num(oy)}em`,
      `--hang:${m.hang}deg`,
      '--drop:1.12em',
      `--fx:${fallX(i).toFixed(3)}em`,
      `--fr:${fallRotation(i)}deg`,
    ].join(';');
    const cls = state === 'on' ? 'slot' : `slot ${state}`;
    const safe = escapeHtml(ch);
    const fixings = m.pts
      .map(([x, y], k) => {
        const pos = `left:${num(x)}em;top:${num(y)}em`;
        const off = k >= count ? ' off' : '';
        return `<i class="hole" style="${pos}"></i><i class="nail${off}" style="${pos}"></i>`;
      })
      .join('');
    return `<div class="${cls}" style="${style}" data-letter="${safe}"><span class="ghost" aria-hidden="true">${safe}</span><span class="g" aria-hidden="true">${safe}</span>${fixings}</div>`;
  });
  const aria = escapeHtml(label ?? transomLabel(letters, counts));
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const sizeAttr = size ? ` style="--ts:${escapeHtml(size)}"` : '';
  return `<div class="transom-wrap"${idAttr}${sizeAttr} data-transom><div class="transom still" role="img" aria-label="${aria}">${slots.join('')}</div><div class="shelf"></div></div>`;
}
