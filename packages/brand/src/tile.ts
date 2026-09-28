/**
 * Variants of the brand tile, derived from the one source file (`tile.svg`) so
 * a redesign is a single SVG swap followed by `task brand:icons`.
 *
 * The source has to keep one shape:
 *
 *     <svg viewBox="0 0 N N"> [<title>…</title>] <rect width="N" height="N" rx="…" fill="…"/> …mark… </svg>
 *
 * The first `<rect>` is the tile's background; everything after it is the mark.
 * Editor metadata (`<metadata>`, comments, the XML prolog) is dropped, so the
 * served favicon carries only the drawing.
 */

export interface Tile {
  /** Edge of the square viewBox, in user units. */
  size: number;
  title: string;
  /** Attributes of the background `<rect>`, as written in the source. */
  backgroundAttrs: string;
  /** Background fill colour. */
  fill: string;
  /** Everything drawn on top of the background. */
  mark: string;
}

/**
 * Android crops maskable icons to the launcher's shape and only guarantees a
 * circle of radius 0.4·N around the centre. The current mark reaches ≈ 0.54·N
 * from the centre (the hook bottom right), so 0.72 brings it to ≈ 0.39·N.
 */
export const MASKABLE_SCALE = 0.72;

const attr = (attrs: string, name: string) =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];

export function parseTile(source: string): Tile {
  const cleaned = source
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata\b[\s\S]*?<\/metadata>/g, '')
    .trim();

  const root = /^<svg\b([^>]*)>([\s\S]*)<\/svg>$/.exec(cleaned);
  if (!root) throw new Error('tile.svg: expected a single <svg> root element');
  const [, rootAttrs = '', inner = ''] = root;

  const viewBox = attr(rootAttrs, 'viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBox?.length !== 4 || viewBox[0] !== 0 || viewBox[1] !== 0) {
    throw new Error('tile.svg: expected viewBox="0 0 N N"');
  }
  const [, , width = 0, height = 0] = viewBox;
  if (width !== height || !(width > 0)) throw new Error('tile.svg: the viewBox must be square');

  let body = inner;
  const title = /<title>([\s\S]*?)<\/title>/.exec(body);
  if (title) body = body.replace(title[0], '');

  const rect = /^\s*<rect\b([^>]*?)\/>/.exec(body);
  if (!rect) throw new Error('tile.svg: the first element must be the background <rect/>');
  const backgroundAttrs = (rect[1] ?? '').trim();
  if (Number(attr(backgroundAttrs, 'width')) !== width) {
    throw new Error('tile.svg: the background <rect> must cover the whole viewBox');
  }
  if (Number(attr(backgroundAttrs, 'height')) !== height) {
    throw new Error('tile.svg: the background <rect> must cover the whole viewBox');
  }
  const fill = attr(backgroundAttrs, 'fill');
  if (!fill) throw new Error('tile.svg: the background <rect> needs a fill');

  return {
    size: width,
    title: title?.[1]?.trim() ?? '',
    backgroundAttrs,
    fill,
    mark: body.slice(rect.index + rect[0].length).trim(),
  };
}

/** Wraps drawing in an `<svg>`; `px` fixes the rendered size (for rasterising). */
export function svgDocument(tile: Tile, content: string, px?: number): string {
  const size = px ? ` width="${px}" height="${px}"` : '';
  const title = tile.title ? `<title>${tile.title}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tile.size} ${tile.size}"${size}>${title}${content}</svg>\n`;
}

/** The tile as drawn: rounded background, transparent corners. */
export function roundedTile(tile: Tile): string {
  return `<rect ${tile.backgroundAttrs}/>${tile.mark}`;
}

/**
 * Full-bleed square. iOS and Windows round or frame the icon themselves and
 * composite transparency on black, so their icons are opaque squares.
 */
export function squareTile(tile: Tile): string {
  const attrs = tile.backgroundAttrs.replace(/\s*\br[xy]="[^"]*"/g, '');
  return `<rect ${attrs}/>${tile.mark}`;
}

/** Full-bleed square with the mark pulled into Android's maskable safe zone. */
export function maskableTile(tile: Tile, scale = MASKABLE_SCALE): string {
  const c = tile.size / 2;
  const transform = `translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})`;
  const attrs = tile.backgroundAttrs.replace(/\s*\br[xy]="[^"]*"/g, '');
  return `<rect ${attrs}/><g transform="${transform}">${tile.mark}</g>`;
}

/** The mark alone on transparency, in its own colours. */
export function bareMark(tile: Tile): string {
  return tile.mark;
}

/** The mark in solid black on transparency — Safari's pinned-tab mask. */
export function monoMark(tile: Tile): string {
  return tile.mark.replace(/\b(fill|stroke)="(?!none")[^"]*"/g, '$1="#000"');
}
