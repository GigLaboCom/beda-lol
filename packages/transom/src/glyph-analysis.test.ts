// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  type AlphaGrid,
  type Command,
  centroid,
  flatten,
  hangAngle,
  inkBox,
  inkRegions,
  inPolygon,
  nailTargets,
  outlineCentroid,
  piecePolygon,
  rasterize,
  snapNails,
  splitInk,
} from './glyph-analysis';

/** A grid from rows of `#` (full ink) and `.` (none); one pixel = one unit, origin at the top left. */
function grid(rows: string[]): AlphaGrid {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8Array(width * rows.length);
  rows.forEach((row, j) => {
    for (let i = 0; i < width; i++) data[j * width + i] = row[i] === '#' ? 255 : 0;
  });
  return { width, height: rows.length, left: 0, top: 0, scale: 1, data };
}

const rect = (x0: number, y0: number, x1: number, y1: number): Command[] => [
  ['M', x0, y0],
  ['L', x1, y0],
  ['L', x1, y1],
  ['L', x0, y1],
  ['Z'],
];

describe('rasterize', () => {
  it('covers a pixel-aligned square fully and nothing else', () => {
    const g = rasterize(rect(2, 3, 6, 5), 1);
    const on = [...g.data].filter((a) => a === 255).length;
    expect(on).toBe(8);
    expect([...g.data].filter((a) => a !== 0 && a !== 255)).toEqual([]);
    expect(inkBox(g)).toEqual([2, 3, 6, 5]);
  });

  it('anti-aliases a half-covered column', () => {
    const g = rasterize(rect(0, 0, 2.5, 2), 1);
    const row = Array.from(g.data.subarray(g.width, 2 * g.width));
    expect(row.filter((a) => a === 128)).toHaveLength(1);
  });

  it('leaves a hole wound the other way empty (non-zero winding)', () => {
    const outer = rect(0, 0, 10, 10);
    const hole: Command[] = [['M', 3, 3], ['L', 3, 7], ['L', 7, 7], ['L', 7, 3], ['Z']];
    const g = rasterize([...outer, ...hole], 1);
    expect([...g.data].filter((a) => a === 255)).toHaveLength(100 - 16);
  });

  it('is deterministic', () => {
    const d: Command[] = [['M', 0, 0], ['Q', 40, -30, 80, 0], ['C', 90, 40, 20, 60, 0, 0], ['Z']];
    expect(rasterize(d, 0.24)).toEqual(rasterize(d, 0.24));
  });
});

describe('outlineCentroid', () => {
  it('is the centre of a rectangle', () => {
    expect(outlineCentroid(rect(0, 0, 4, 2))).toEqual([2, 1]);
  });

  it('subtracts a hole', () => {
    // 10×10 with a 2×10 slot cut from the right half: the centroid moves left.
    const hole: Command[] = [['M', 6, 0], ['L', 6, 10], ['L', 8, 10], ['L', 8, 0], ['Z']];
    const [x, y] = outlineCentroid([...rect(0, 0, 10, 10), ...hole]);
    expect(x).toBeCloseTo((100 * 5 - 20 * 7) / 80, 10);
    expect(y).toBeCloseTo(5, 10);
  });

  it('agrees with the raster centroid of a curved shape', () => {
    const d: Command[] = [['M', 0, 0], ['C', 400, -600, 900, 200, 500, 700], ['L', 0, 500], ['Z']];
    const exact = outlineCentroid(d);
    const raster = centroid(rasterize(d, 0.24));
    expect(Math.hypot(exact[0] - raster[0], exact[1] - raster[1])).toBeLessThan(2);
  });

  it('flattens curves into closed contours', () => {
    const contours = flatten([['M', 0, 0], ['Q', 5, 5, 10, 0], ['Z']], 4);
    expect(contours).toHaveLength(1);
    expect(contours[0]).toHaveLength(5);
  });
});

describe('centroid', () => {
  it('finds the middle of a bar', () => {
    const g = grid(['......', '.####.', '.####.', '......']);
    expect(centroid(g)).toEqual([3, 2]);
  });

  it('splits the ink by a piece: remainder and piece', () => {
    const g = grid(['######', '######']);
    const piece = [
      [3, -1],
      [7, -1],
      [7, 3],
      [3, 3],
    ] as const;
    expect(centroid(g, piece)).toEqual([1.5, 1]);
    expect(centroid(g, piece, true)).toEqual([4.5, 1]);
    expect(splitInk(g, piece)).toEqual({ inside: 6, outside: 6 });
  });
});

describe('snapNails', () => {
  const g = grid(['#####....', '#####....', '.....####', '.....####']);

  it('snaps a target to the nearest ink pixel centre', () => {
    expect(snapNails(g, [[-3, -3]])).toEqual([[0.5, 0.5]]);
  });

  it('never lands inside the piece', () => {
    const piece = [
      [-1, -1],
      [3, -1],
      [3, 5],
      [-1, 5],
    ] as const;
    const [p] = snapNails(g, [[0, 0]], piece);
    expect(p).toBeDefined();
    expect(inPolygon(p as [number, number], piece)).toBe(false);
    expect(p).toEqual([3.5, 0.5]);
  });

  it('breaks ties by the smaller y, then the smaller x', () => {
    const t = grid(['#.#', '...', '#.#']);
    expect(snapNails(t, [[1.5, 1.5]])).toEqual([[0.5, 0.5]]);
  });

  it('keeps a target with no ink to snap to', () => {
    expect(snapNails(grid(['...']), [[1, 1]])).toEqual([[1, 1]]);
  });
});

describe('nail targets and pieces', () => {
  it('insets corner targets by 12 % with the hinge top left', () => {
    expect(nailTargets([0, 0, 100, 200], false)).toEqual([
      [12, 24],
      [88, 24],
      [12, 176],
      [88, 176],
    ]);
  });

  it('puts the hinge of a round letter on the lower-left rivet', () => {
    const [hinge] = nailTargets([0, 0, 100, 100], true);
    expect(hinge?.[0]).toBeCloseTo(10);
    expect(hinge?.[1]).toBeCloseTo(76);
  });

  it('maps piece fractions to the advance and the ink box', () => {
    expect(
      piecePolygon(
        [
          [0.5, 0],
          [1, 1],
        ],
        600,
        [0, -700, 580, 0],
      ),
    ).toEqual([
      [300, -700],
      [600, 0],
    ]);
  });
});

describe('hangAngle', () => {
  it('is 0 when the centroid is already straight below the hinge', () => {
    expect(hangAngle([0, 0], [0, 10])).toBe(0);
  });

  it('is positive (clockwise, y down) when the centroid is right of the hinge', () => {
    expect(hangAngle([0, 0], [10, 10])).toBeCloseTo(45);
    expect(hangAngle([0, 0], [-10, 10])).toBeCloseTo(-45);
  });

  it('passes 90° when the centroid is above the hinge', () => {
    expect(hangAngle([0, 10], [10, 0])).toBeCloseTo(135);
  });
});

describe('inkRegions', () => {
  it('counts connected ink, ignoring specks', () => {
    expect(inkRegions(grid(['##..##', '##..##']))).toBe(2);
    expect(inkRegions(grid(['##...#', '##....']))).toBe(1);
    expect(inkRegions(grid(['##..', '.##.', '..##']))).toBe(1);
  });
});
