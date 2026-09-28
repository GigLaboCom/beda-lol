/**
 * Glyph analysis for the generator: rasterise an outline, find its ink,
 * snap nails to it, and compute centroids and hang angles. Pure and
 * deterministic (plain IEEE arithmetic, no native rasteriser), so a fresh
 * run gives byte-identical data on every machine. Used by
 * `scripts/gen-glyphs.ts` and tests only; never shipped to the browser.
 *
 * Coordinates are glyph units (1000 per em), y down, origin at the pen
 * position on the baseline — the same space as the generated paths.
 */
import type { Polygon } from './pieces';

export type Point = readonly [x: number, y: number];

/** An outline command in glyph units, y down. */
export type Command =
  | readonly ['M' | 'L', number, number]
  | readonly ['Q', number, number, number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

/** An ink box: left, top, right, bottom. */
export type Box = readonly [x0: number, y0: number, x1: number, y1: number];

/**
 * Coverage of an outline on a pixel grid, 0–255 per pixel. Pixel `(i, j)`
 * spans `[left + i, left + i + 1)` × `[top + j, top + j + 1)` in pixels,
 * and a pixel is `1 / scale` glyph units wide.
 */
export interface AlphaGrid {
  width: number;
  height: number;
  left: number;
  top: number;
  scale: number;
  data: Uint8Array;
}

/** SVG path data for the commands, numbers as given. */
export function pathData(commands: readonly Command[]): string {
  return commands.map(([op, ...args]) => op + args.join(' ')).join('');
}

/** Curves split into this many straight segments for centroids and raster. */
const CURVE_STEPS = 24;

/** The outline as closed polygons (curves flattened), one per contour. */
export function flatten(commands: readonly Command[], steps = CURVE_STEPS): Point[][] {
  const contours: Point[][] = [];
  let pts: Point[] = [];
  let cur: Point = [0, 0];
  let start: Point = [0, 0];
  const close = () => {
    if (pts.length > 2) contours.push(pts);
    pts = [];
  };
  for (const c of commands) {
    switch (c[0]) {
      case 'M':
        close();
        cur = [c[1], c[2]];
        start = cur;
        pts.push(cur);
        break;
      case 'L':
        cur = [c[1], c[2]];
        pts.push(cur);
        break;
      case 'Q': {
        const [x0, y0] = cur;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          pts.push([
            u * u * x0 + 2 * u * t * c[1] + t * t * c[3],
            u * u * y0 + 2 * u * t * c[2] + t * t * c[4],
          ]);
        }
        cur = [c[3], c[4]];
        break;
      }
      case 'C': {
        const [x0, y0] = cur;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          pts.push([
            u ** 3 * x0 + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t ** 3 * c[5],
            u ** 3 * y0 + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t ** 3 * c[6],
          ]);
        }
        cur = [c[5], c[6]];
        break;
      }
      case 'Z':
        close();
        cur = start;
        break;
    }
  }
  close();
  return contours;
}

/**
 * Exact area centroid of an outline: signed shoelace over the flattened
 * contours, so holes (opposite winding) subtract. Independent of any raster.
 */
export function outlineCentroid(commands: readonly Command[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (const pts of flatten(commands)) {
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i] as Point;
      const [x1, y1] = pts[(i + 1) % pts.length] as Point;
      const cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
  }
  return [cx / (3 * area), cy / (3 * area)];
}

/** Sub-scanlines per pixel row; horizontal coverage is exact. */
const SUBSAMPLES = 16;

/**
 * Anti-aliased coverage of the outline (non-zero winding, as fonts and SVG
 * fill), at `scale` pixels per glyph unit.
 */
export function rasterize(commands: readonly Command[], scale: number): AlphaGrid {
  const contours = flatten(commands).map((pts) =>
    pts.map(([x, y]): Point => [x * scale, y * scale]),
  );
  const all = contours.flat();
  const left = Math.floor(Math.min(...all.map((p) => p[0]))) - 1;
  const top = Math.floor(Math.min(...all.map((p) => p[1]))) - 1;
  const width = Math.ceil(Math.max(...all.map((p) => p[0]))) - left + 1;
  const height = Math.ceil(Math.max(...all.map((p) => p[1]))) - top + 1;
  const rows: [x: number, dir: number][][] = Array.from({ length: height * SUBSAMPLES }, () => []);
  for (const pts of contours) {
    for (let k = 0; k < pts.length; k++) {
      const [ax, ay] = pts[k] as Point;
      const [bx, by] = pts[(k + 1) % pts.length] as Point;
      if (ay === by) continue;
      const dir = by > ay ? 1 : -1;
      const y0 = (Math.min(ay, by) - top) * SUBSAMPLES;
      const y1 = (Math.max(ay, by) - top) * SUBSAMPLES;
      // Sample rows whose centre (s + 0.5) lies in [y0, y1).
      for (let s = Math.ceil(y0 - 0.5); s + 0.5 < y1; s++) {
        const y = (s + 0.5) / SUBSAMPLES + top;
        rows[s]?.push([ax + ((y - ay) * (bx - ax)) / (by - ay) - left, dir]);
      }
    }
  }
  const cover = new Float64Array(width * height);
  rows.forEach((xs, s) => {
    xs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const row = Math.floor(s / SUBSAMPLES) * width;
    let winding = 0;
    for (let k = 0; k < xs.length - 1; k++) {
      winding += (xs[k] as [number, number])[1];
      if (winding === 0) continue;
      const xa = (xs[k] as [number, number])[0];
      const xb = (xs[k + 1] as [number, number])[0];
      for (let i = Math.floor(xa); i < xb; i++) {
        cover[row + i] =
          (cover[row + i] ?? 0) + (Math.min(xb, i + 1) - Math.max(xa, i)) / SUBSAMPLES;
      }
    }
  });
  const data = new Uint8Array(width * height);
  for (let k = 0; k < data.length; k++) data[k] = Math.round(Math.min(1, cover[k] ?? 0) * 255);
  return { width, height, left, top, scale, data };
}

/** Centre of pixel `(i, j)` in glyph units. */
export function pixelCentre(grid: AlphaGrid, i: number, j: number): Point {
  return [(grid.left + i + 0.5) / grid.scale, (grid.top + j + 0.5) / grid.scale];
}

/** The box around every pixel above `threshold`, in glyph units (pixel edges). */
export function inkBox(grid: AlphaGrid, threshold = 128): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let j = 0; j < grid.height; j++) {
    for (let i = 0; i < grid.width; i++) {
      if ((grid.data[j * grid.width + i] ?? 0) <= threshold) continue;
      x0 = Math.min(x0, i);
      x1 = Math.max(x1, i + 1);
      y0 = Math.min(y0, j);
      y1 = Math.max(y1, j + 1);
    }
  }
  const s = grid.scale;
  return [(grid.left + x0) / s, (grid.top + y0) / s, (grid.left + x1) / s, (grid.top + y1) / s];
}

/** Even-odd point-in-polygon test. */
export function inPolygon([px, py]: Point, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] as Point;
    const [xj, yj] = poly[j] as Point;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * A piece polygon in glyph units from its fractions (`pieces.ts`): x of the
 * advance from the pen position, y of the ink box from its top.
 */
export function piecePolygon(fractions: Polygon, advance: number, ink: Box): Point[] {
  const [, y0, , y1] = ink;
  return fractions.map(([fx, fy]): Point => [fx * advance, y0 + fy * (y1 - y0)]);
}

/**
 * Where the nails aim before snapping: for round letters two rivets per side
 * at `centre ± 0.40w, ± 0.26h`, hinge at the lower left; otherwise the
 * corners inset 12 %, hinge at the top left.
 */
export function nailTargets(ink: Box, rivets: boolean): Point[] {
  const [x0, y0, x1, y1] = ink;
  const w = x1 - x0;
  const h = y1 - y0;
  if (rivets) {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return [
      [cx - 0.4 * w, cy + 0.26 * h],
      [cx - 0.4 * w, cy - 0.26 * h],
      [cx + 0.4 * w, cy - 0.26 * h],
      [cx + 0.4 * w, cy + 0.26 * h],
    ];
  }
  return [
    [x0 + 0.12 * w, y0 + 0.12 * h],
    [x1 - 0.12 * w, y0 + 0.12 * h],
    [x0 + 0.12 * w, y1 - 0.12 * h],
    [x1 - 0.12 * w, y1 - 0.12 * h],
  ];
}

/** A target in fractions of the ink box, in glyph units. */
export function inkPoint(ink: Box, [fx, fy]: Point): Point {
  const [x0, y0, x1, y1] = ink;
  return [x0 + fx * (x1 - x0), y0 + fy * (y1 - y0)];
}

/**
 * Snap each target to the centre of the nearest pixel with alpha above
 * `threshold`, outside `piece` when given. The whole grid is searched and
 * ties go to the smaller y, then the smaller x, so the result is stable.
 * A target with no ink to snap to stays where it is. `quantize` maps a pixel
 * centre to the point that is stored (e.g. rounded to integers); the piece
 * test uses it, so a stored nail is never inside the piece, while distances
 * use the exact centre.
 */
export function snapNails(
  grid: AlphaGrid,
  targets: readonly Point[],
  piece?: Polygon,
  threshold = 160,
  quantize: (p: Point) => Point = (p) => p,
): Point[] {
  const ink: [exact: Point, stored: Point][] = [];
  for (let j = 0; j < grid.height; j++) {
    for (let i = 0; i < grid.width; i++) {
      if ((grid.data[j * grid.width + i] ?? 0) <= threshold) continue;
      const exact = pixelCentre(grid, i, j);
      const stored = quantize(exact);
      if (piece && inPolygon(stored, piece)) continue;
      ink.push([exact, stored]);
    }
  }
  return targets.map((t) => {
    let best: Point = t;
    let bestD = Infinity;
    for (const [p, stored] of ink) {
      const d = (p[0] - t[0]) ** 2 + (p[1] - t[1]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = stored;
      }
    }
    return best;
  });
}

/**
 * Alpha-weighted centroid of the ink, in glyph units. With `piece`, of the
 * ink outside it (the remainder), or with `invert` of the ink inside it.
 */
export function centroid(grid: AlphaGrid, piece?: Polygon, invert = false): Point {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let j = 0; j < grid.height; j++) {
    for (let i = 0; i < grid.width; i++) {
      const a = grid.data[j * grid.width + i] ?? 0;
      if (!a) continue;
      const p = pixelCentre(grid, i, j);
      if (piece && inPolygon(p, piece) !== invert) continue;
      sx += p[0] * a;
      sy += p[1] * a;
      n += a;
    }
  }
  return n ? [sx / n, sy / n] : [Number.NaN, Number.NaN];
}

/**
 * The rotation (degrees, clockwise, y down) about `hinge` that brings
 * `centre` straight below it: `atan2(dx, dy)`.
 */
export function hangAngle(hinge: Point, centre: Point): number {
  return (Math.atan2(centre[0] - hinge[0], centre[1] - hinge[1]) * 180) / Math.PI;
}

/** How many ink pixels (alpha above `threshold`) are inside and outside `piece`. */
export function splitInk(grid: AlphaGrid, piece: Polygon, threshold = 128) {
  let inside = 0;
  let outside = 0;
  for (let j = 0; j < grid.height; j++) {
    for (let i = 0; i < grid.width; i++) {
      if ((grid.data[j * grid.width + i] ?? 0) <= threshold) continue;
      if (inPolygon(pixelCentre(grid, i, j), piece)) inside++;
      else outside++;
    }
  }
  return { inside, outside };
}

/**
 * Connected regions (8-neighbour) of the ink above `threshold`, outside
 * `piece` when given, ignoring specks smaller than `minPixels`.
 */
export function inkRegions(
  grid: AlphaGrid,
  piece?: Polygon,
  threshold = 128,
  minPixels = 4,
): number {
  const { width, height, data } = grid;
  const on = new Uint8Array(width * height);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      if ((data[k] ?? 0) > threshold && !(piece && inPolygon(pixelCentre(grid, i, j), piece))) {
        on[k] = 1;
      }
    }
  }
  let regions = 0;
  for (let k0 = 0; k0 < on.length; k0++) {
    if (!on[k0]) continue;
    let size = 0;
    const stack = [k0];
    on[k0] = 0;
    while (stack.length) {
      const k = stack.pop() as number;
      size++;
      const i = k % width;
      const j = (k - i) / width;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= width || nj >= height) continue;
          const nk = nj * width + ni;
          if (on[nk]) {
            on[nk] = 0;
            stack.push(nk);
          }
        }
      }
    }
    if (size >= minPixels) regions++;
  }
  return regions;
}
