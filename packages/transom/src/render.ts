import type { BreakKey } from '@beda/core';
import {
  BASELINE,
  BOTTOM_SHADE,
  dropFor,
  fallRotation,
  fallX,
  GAP,
  HOLE_SCALE,
  NAIL_OFF,
  NAIL_R,
  PAD_BOTTOM,
  PAD_TOP,
  PAD_X,
  PLANK,
  pieceFallRotation,
  pieceFallX,
  RADIUS_BOTTOM_X,
  RADIUS_BOTTOM_Y,
  RADIUS_TOP,
  SEAM,
  SHADOW_DY,
  SHELF_GAP,
  SHELF_H,
  SHELF_MAX_W,
  SHELF_OVERHANG,
  SHELF_TOP,
  SLOT_H,
  SPACE,
  TOP_LIGHT,
  UNITS_PER_EM as U,
} from './geometry';
import { type Glyph, glyphFor, type Point } from './glyphs';
import {
  type BoardState,
  fromNails,
  RU_LABEL_TEXT,
  slotLook,
  type TransomLabelText,
  transomLabel,
} from './state';

export interface RenderOptions {
  /** One entry per slot; `' '` is a narrow empty slot. Not needed with `state`. */
  letters?: readonly string[];
  /** Nails per slot, 0..4. Missing entries count as 4. */
  nails?: readonly number[];
  /** The piece each slot can lose (fixed at render time). */
  breaks?: readonly (BreakKey | undefined)[];
  /** Slots whose piece has already broken off. */
  broken?: readonly boolean[];
  /** The whole state at once, instead of `letters` / `nails` / `breaks` / `broken`. */
  state?: BoardState;
  /** Overrides the generated aria-label. */
  label?: string;
  /** Wording for the generated aria-label (prefix and the “empty” word). */
  labelText?: TransomLabelText;
  /** id on the wrapper, for the client controller; also the default id prefix. */
  id?: string;
  /** Prefix for `<use>` and clip-path ids, unique per board on a page. */
  idPrefix?: string;
  /** Slot index to highlight; the other letters are dimmed. */
  highlight?: number;
  /** Dev only: hinge, plumb line, centroid and piece outlines (shown with `.debug`). */
  debug?: boolean;
  /**
   * A self-contained `<svg>` (no wrapper, `xmlns`, colours in an embedded
   * `<style>` from `palette`, token name → colour) for resvg / share images.
   * The site uses `transom.css` instead; the class names are the same.
   */
  standalone?: { palette: Readonly<Record<string, string>> };
}

/** Colour of each board class, by token name (`transom.css` has the same rules). */
export const CLASS_TOKENS: Readonly<Record<string, string>> = {
  't-plank': 'plank',
  't-seam': 'seam',
  't-plank-hi': 'plank-hi',
  't-ghost': 'plank-hi',
  't-hull': 'hull',
  't-shelf': 'shelf',
  't-brass': 'brass',
  't-shadow': 'glyph-shadow',
  hole: 'hole',
  nail: 'brass-hi',
};

/** The embedded stylesheet of a standalone board: the static rules of `transom.css`. */
function standaloneStyle(palette: Readonly<Record<string, string>>): string {
  const colour = (token: string) => {
    const c = palette[token];
    if (!c) throw new Error(`renderTransom: no colour for token --${token}`);
    return c;
  };
  const rules = Object.entries(CLASS_TOKENS).map(
    ([cls, token]) => `.${cls}{fill:${colour(token)}}`,
  );
  rules.push(
    `.dim .t-brass{fill:${colour('plank-hi')}}`,
    '.dim .t-shadow{fill:none}',
    '.dim .nail{opacity:.35}',
    '.layer-dbg,.d-cen,.d-poly{display:none}',
  );
  return `<style>${rules.join('')}</style>`;
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

const r = (n: number) => Math.round(n) || 0;
const em = (n: number) => r(n * U);
const num = (n: number) => String(Math.round(n * 1000) / 1000);

interface Laid {
  ch: string;
  x: number;
  w: number;
  glyph?: Glyph;
  brk?: BreakKey;
}

/** Slots placed left to right in glyph units, from the board's left edge. */
function layout(letters: readonly string[], breaks: readonly (BreakKey | undefined)[] = []) {
  let x = em(PAD_X);
  const slots = letters.map((ch, i): Laid => {
    const glyph = ch === ' ' ? undefined : glyphFor(ch);
    const w = glyph ? glyph.adv : em(SPACE);
    const key = breaks[i];
    const brk = key && glyph?.breaks?.[key] ? key : undefined;
    const slot = { ch, x, w, glyph, brk };
    x += w + em(GAP);
    return slot;
  });
  const board = letters.length ? x - em(GAP) + em(PAD_X) : 2 * em(PAD_X);
  const width = Math.max(board, Math.min(board + 2 * em(SHELF_OVERHANG), em(SHELF_MAX_W)));
  return { slots, board, width };
}

/** Width of the rendered board (with the shelf) in em of its font size. */
export function boardWidthEm(letters: readonly string[]): number {
  return layout(letters).width / U;
}

/** Height of the rendered board (with the shelf) in em. */
export const BOARD_HEIGHT_EM = PAD_TOP + SLOT_H + PAD_BOTTOM + SHELF_GAP + SHELF_H;

/** Font size (px) that fits the board into `availPx`, clamped to `[min, max]`. */
export function fitSize(
  letters: readonly string[],
  availPx: number,
  { min = 20, max = 64 }: { min?: number; max?: number } = {},
): number {
  return Math.round(Math.max(min, Math.min(max, availPx / boardWidthEm(letters))));
}

/** Board outline with `border-radius`-style corners, scaled down when they don't fit. */
function boardShape(x0: number, w: number, h: number): string {
  const t = em(RADIUS_TOP);
  const f = Math.min(1, w / (2 * em(RADIUS_BOTTOM_X)), h / (t + em(RADIUS_BOTTOM_Y)));
  const rt = r(t * f);
  const bx = r(em(RADIUS_BOTTOM_X) * f);
  const by = r(em(RADIUS_BOTTOM_Y) * f);
  const x1 = x0 + w;
  return `M${x0} ${rt}Q${x0} 0 ${x0 + rt} 0H${x1 - rt}Q${x1} 0 ${x1} ${rt}V${h - by}A${bx} ${by} 0 0 1 ${x1 - bx} ${h}H${x0 + bx}A${bx} ${by} 0 0 1 ${x0} ${h - by}Z`;
}

const pts = (poly: readonly Point[]) => `M${poly.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

/**
 * Server-side SVG for the transom with the state already applied: the final
 * transforms are attributes, so it looks right without JavaScript, without
 * CSS and in resvg. `attachTransom` takes the same markup over; per-slot
 * values for the CSS ride in `data-v` and are set through CSSOM (a strict
 * CSP allows no `style` attributes).
 *
 * Paint order is board-wide (SVG has no z-index): imprints, holes, letters,
 * pieces, nails. Each layer holds one `<g class="slot iN">` per slot.
 */
export function renderTransom(options: RenderOptions): string {
  const state =
    options.state ??
    (() => {
      const s = fromNails(options.letters ?? [], options.nails);
      return {
        ...s,
        breaks: options.breaks,
        slots: s.slots.map((slot, i) => ({ ...slot, broken: !!options.broken?.[i] })),
      };
    })();
  const { letters, breaks } = state;
  const { labelText, highlight, debug } = options;
  const p = escapeHtml(options.idPrefix ?? (options.id ? `${options.id}-` : 't-'));
  const { slots, board, width } = layout(letters, breaks);
  const bx = r((width - board) / 2);
  const boardH = em(PAD_TOP + SLOT_H + PAD_BOTTOM);
  const height = em(BOARD_HEIGHT_EM);
  const top = em(PAD_TOP + BASELINE);
  const defs = new Map<string, string>();
  const layers = { ghost: '', hole: '', main: '', piece: '', nail: '', dbg: '' };

  slots.forEach((slot, i) => {
    const g = slot.glyph;
    if (!g) return;
    const cp = slot.ch.codePointAt(0) ?? 0;
    const use = `${p}g${cp}`;
    defs.set(use, `<path id="${use}" d="${g.d}"/>`);
    const b = slot.brk ? g.breaks?.[slot.brk] : undefined;
    const s = state.slots[i] ?? { nails: 4, broken: false };
    const look = g.falls ? slotLook(s.nails) : 'on';
    const broken = !!(b && s.broken);
    const nails = (b ?? g).nails;
    const [hx, hy] = nails[0] ?? [0, 0];
    const hang = (b ? b.hang : g.hang) ?? 0;
    const drop = g.drop ?? em(dropFor(0));
    const fx = em(fallX(i));
    const fr = fallRotation(i);

    const cls = ['slot', `i${i}`];
    if (look !== 'on') cls.push(look);
    if (broken) cls.push('broken');
    if (highlight !== undefined && highlight !== i) cls.push('dim');
    const vars = g.falls ? [`hang:${hang}deg`, `drop:${drop}px`, `fx:${fx}px`, `fr:${fr}deg`] : [];
    const face = `<use href="#${use}" class="t-shadow" transform="translate(0 ${em(SHADOW_DY)})"/><use href="#${use}" class="t-brass"/>`;
    const at = `transform="translate(${bx + slot.x} ${top})"`;
    const data = ` data-g="${cp}"${slot.brk ? ` data-b="${escapeHtml(slot.brk)}"` : ''}`;
    const wrap = (inner: string, extra = '') =>
      `<g class="${cls.join(' ')}"${data}${extra} ${at}>${inner}</g>`;

    const mainT =
      look === 'hang'
        ? ` transform="rotate(${hang})"`
        : look === 'fall'
          ? ` transform="translate(${fx} ${drop}) rotate(${fr})"`
          : '';
    const cen = b ? b.rest : g.centroid;
    // Debug marks that move with the letter or the piece; the rest go on the dbg layer.
    const dCen =
      debug && cen ? `<circle class="d-cen" cx="${cen[0]}" cy="${cen[1]}" r="${em(0.026)}"/>` : '';
    let body = face;
    if (b && slot.brk) {
      const clip = pts(b.poly);
      const [x0, y0, x1, y1] = g.ink;
      const m = em(1);
      defs.set(
        `${p}k${i}`,
        `<clipPath id="${p}k${i}"><path clip-rule="evenodd" d="M${x0 - m} ${y0 - m}H${x1 + m}V${y1 + m}H${x0 - m}Z${clip}"/></clipPath><clipPath id="${p}p${i}"><path d="${clip}"/></clipPath>`,
      );
      body = `<g clip-path="url(#${p}k${i})">${face}</g>`;
      const [pcx, pcy] = b.centroid;
      const pfx = em(pieceFallX(i));
      const pfr = pieceFallRotation(i);
      vars.push(`pfx:${pfx}px`, `pfr:${pfr}deg`, `pdrop:${b.drop}px`);
      const pieceT = broken ? ` transform="translate(${pfx} ${b.drop}) rotate(${pfr})"` : '';
      layers.piece += wrap(
        `<g transform="translate(${pcx} ${pcy})"><g class="piece"${pieceT}><g transform="translate(${-pcx} ${-pcy})"><g clip-path="url(#${p}p${i})">${face}</g>${debug ? `<path class="d-poly" d="${clip}"/>` : ''}</g></g></g>`,
      );
    }
    layers.ghost += wrap(`<use href="#${use}" class="t-ghost"/>`);
    layers.main += wrap(
      `<g transform="translate(${hx} ${hy})"><g class="main"${mainT}><g transform="translate(${-hx} ${-hy})">${body}${dCen}</g></g></g>`,
      `${vars.length ? ` data-v="${vars.join(';')}"` : ''}${g.falls ? '' : ' data-fixed=""'}`,
    );
    const on = g.falls ? s.nails : nails.length;
    layers.hole += wrap(
      nails
        .map(
          ([x, y]) => `<circle class="hole" cx="${x}" cy="${y}" r="${em(NAIL_R * HOLE_SCALE)}"/>`,
        )
        .join(''),
    );
    layers.nail += wrap(
      nails
        .map(([x, y], k) => {
          const off = k >= on;
          const t = off
            ? ` transform="translate(${em(NAIL_OFF[0])} ${em(NAIL_OFF[1])})" opacity="0"`
            : '';
          return `<circle class="nail n${k}${off ? ' off' : ''}" cx="${x}" cy="${y}" r="${em(NAIL_R)}"${t}/>`;
        })
        .join(''),
    );
    if (debug) {
      layers.dbg += wrap(
        `<line class="d-plumb" x1="${hx}" y1="${hy}" x2="${hx}" y2="${hy + em(1.5)}"/><circle class="d-hinge" cx="${hx}" cy="${hy}" r="${em(0.03)}"/><rect class="d-cell" x="0" y="${-em(BASELINE)}" width="${g.adv}" height="${em(SLOT_H)}"/>`,
      );
    }
  });

  const seams: string[] = [];
  for (let y = em(PLANK); y < boardH; y += em(PLANK + SEAM)) {
    seams.push(`<rect class="t-seam" x="${bx}" y="${y}" width="${board}" height="${em(SEAM)}"/>`);
  }
  const shelfY = boardH + em(SHELF_GAP);
  defs.set(
    `${p}board`,
    `<clipPath id="${p}board"><path d="${boardShape(bx, board, boardH)}"/></clipPath><linearGradient id="${p}shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity="0"/><stop offset="1" stop-opacity="0.35"/></linearGradient>`,
  );
  const background =
    `<g clip-path="url(#${p}board)"><rect class="t-plank" x="${bx}" y="0" width="${board}" height="${boardH}"/>${seams.join('')}` +
    `<rect x="${bx}" y="${boardH - em(BOTTOM_SHADE)}" width="${board}" height="${em(BOTTOM_SHADE)}" fill="url(#${p}shade)"/>` +
    `<rect class="t-plank-hi" x="${bx}" y="0" width="${board}" height="${em(TOP_LIGHT)}"/></g>` +
    `<rect class="t-hull" x="0" y="${shelfY}" width="${width}" height="${em(SHELF_H)}"/><rect class="t-shelf" x="0" y="${shelfY}" width="${width}" height="${em(SHELF_TOP)}"/>`;

  const aria = escapeHtml(options.label ?? transomLabel(state, labelText));
  const words = {
    prefix: labelText?.prefix ?? RU_LABEL_TEXT.prefix,
    empty: labelText?.empty ?? RU_LABEL_TEXT.empty,
  };
  const idAttr = options.id ? ` id="${escapeHtml(options.id)}"` : '';
  const xmlns = options.standalone ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  const style = options.standalone ? standaloneStyle(options.standalone.palette) : '';
  const svg =
    `<svg${xmlns} class="transom still" role="img" aria-label="${aria}" viewBox="0 0 ${width} ${height}" width="${num(width / U)}em" height="${num(height / U)}em"` +
    ` data-text="${escapeHtml(letters.join(''))}" data-label-prefix="${escapeHtml(words.prefix)}" data-label-empty="${escapeHtml(words.empty)}">` +
    `${style}<defs>${[...defs.values()].join('')}</defs>${background}` +
    Object.entries(layers)
      .filter(([, html]) => html)
      .map(([name, html]) => `<g class="layer layer-${name}">${html}</g>`)
      .join('') +
    '</svg>';
  if (options.standalone) return svg;
  return `<div class="transom-wrap"${idAttr} data-transom>${svg}</div>`;
}
