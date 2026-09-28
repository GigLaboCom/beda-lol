import { readFileSync } from 'node:fs';
import type { IconSource } from './icons';
import {
  bareMark,
  maskableTile,
  monoMark,
  parseTile,
  roundedTile,
  squareTile,
  svgDocument,
  type Tile,
} from './tile';

/** The source tile, parsed. */
export function loadTile(): Tile {
  return parseTile(readFileSync(new URL('./tile.svg', import.meta.url), 'utf8'));
}

const drawings: Record<IconSource, (tile: Tile) => string> = {
  tile: roundedTile,
  square: squareTile,
  maskable: maskableTile,
  mark: bareMark,
  mono: monoMark,
};

/** The SVG document for one source; `px` fixes its rendered size. */
export function iconSvg(tile: Tile, source: IconSource, px?: number): string {
  return svgDocument(tile, drawings[source](tile), px);
}
