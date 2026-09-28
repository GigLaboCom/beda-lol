/**
 * Renders the favicon / app-icon set from `src/tile.svg` into the web app's
 * `public/`. Run it after the artwork changes; the output is committed, so
 * neither the build nor CI needs sharp:
 *
 *     task brand:icons                 # from the repo root (or: pnpm brand:icons)
 *     task brand:icons -- --out <dir>  # somewhere else, e.g. to preview a redesign
 *
 * What goes where is decided in `src/icons.ts`; the drawings (rounded tile,
 * full-bleed square, maskable, bare and mono mark) come from `src/tile.ts`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import {
  aliases,
  BROWSERCONFIG,
  browserconfigXml,
  ICO_SIZES,
  type IconSource,
  rasterIcons,
  vectorIcons,
} from '../src/icons';
import { iconSvg, loadTile } from '../src/render';
import type { Tile } from '../src/tile';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEFAULT_OUT = join(REPO_ROOT, 'apps/web/public');

// A stray `--` (pnpm and task forward it) is not an option.
const args = process.argv.slice(2).filter((a) => a !== '--');
const { values } = parseArgs({ args, options: { out: { type: 'string' } } });
// `pnpm --filter` runs in the package directory; resolve --out against where the command was typed.
const cwd = process.env.INIT_CWD ?? process.cwd();
const outDir = values.out ? resolve(cwd, values.out) : DEFAULT_OUT;

/** Rasterise at the target size (not a downscale of a big render), so small sizes stay crisp. */
const renderPng = (tile: Tile, source: IconSource, size: number) =>
  sharp(Buffer.from(iconSvg(tile, source, size)))
    .png({ compressionLevel: 9 })
    .toBuffer();

/** PNG-in-ICO: every browser in support reads it, and it is far smaller than BMP entries. */
function encodeIco(pngs: { size: number; data: Buffer }[]): Buffer {
  const HEADER = 6;
  const ENTRY = 16;
  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = HEADER + ENTRY * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(ENTRY);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

async function main() {
  const tile = loadTile();
  await mkdir(outDir, { recursive: true });
  const written = new Map<string, Buffer | string>();

  for (const icon of rasterIcons) {
    written.set(icon.file, await renderPng(tile, icon.source, icon.size));
  }
  for (const [from, to] of aliases) {
    const data = written.get(from);
    if (!data) throw new Error(`alias ${to}: ${from} is not generated`);
    written.set(to, data);
  }
  for (const icon of vectorIcons) {
    written.set(icon.file, iconSvg(tile, icon.source));
  }
  const ico = await Promise.all(
    ICO_SIZES.map(async (size) => ({ size, data: await renderPng(tile, 'tile', size) })),
  );
  written.set('favicon.ico', encodeIco(ico));
  written.set(BROWSERCONFIG, browserconfigXml());

  for (const [file, data] of written) await writeFile(join(outDir, file), data);

  console.log(`Wrote ${written.size} files to ${relative(cwd, outDir) || '.'}:`);
  console.log([...written.keys()].map((f) => `  ${f}`).join('\n'));
}

await main();
