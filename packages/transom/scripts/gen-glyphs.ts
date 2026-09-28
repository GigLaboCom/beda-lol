// Writes the glyph tables (transom core + ext) and the charset (core) from glyphs.config.ts.
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { buildGlyphs } from './glyphs-build';

const root = new URL('../../../', import.meta.url);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const build = buildGlyphs();
for (const [path, text] of Object.entries(build.files)) {
  writeFileSync(new URL(path, root), text);
  console.log(`${path}: ${kb(Buffer.byteLength(text))}, gzip ${kb(gzipSync(text).length)}`);
}
console.log(`${build.charset.length} characters, ${build.falling.length} can fall`);
