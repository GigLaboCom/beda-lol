/**
 * Prebuilds share images (1200×630 PNG) from the ShareCard design:
 *   public/og/osmotr/<code>.png  — all 729 quiz results
 *   public/og/default.png        — home page
 *   public/og/bukvy/<slug>.png   — one per pillar article
 *
 * satori lays the card out and turns text into paths; resvg renders the SVG;
 * sharp re-encodes to a palette PNG to keep 729 files small.
 * Run through Nx (`nx run web:og`), which caches public/og until the script,
 * @beda/core, @beda/transom or the fonts change.
 *
 *   tsx scripts/og.ts                      # everything
 *   tsx scripts/og.ts --codes 222222,002222 --out /tmp/og   # a few, elsewhere
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { allCodes, classify, decode, type LetterState, statesToNails, WORD } from '@beda/core';
import { fallRotation, fallX, mountFor } from '@beda/transom';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');
const repoRoot = resolve(webRoot, '../..');

// Colours of the dark theme (packages/tokens/src/tokens.css).
const C = {
  tar: '#1c140e',
  plank: '#6e4b2d',
  seam: '#4b321e',
  plankHi: '#8a6038',
  shelf: '#a9834f',
  hull: '#2a1e15',
  text: '#ede4cf',
  text2: '#d9cdb4',
  muted: '#b8a385',
  brass: '#d6a93e',
  brassHi: '#ebc565',
  hole: '#2a1d13',
  glyphShadow: '#3a2412',
};

const DISPLAY = 'Playfair Display cyrillic, Playfair Display latin';
const SANS = 'IBM Plex Sans cyrillic, IBM Plex Sans latin';
const MONO = 'IBM Plex Mono cyrillic, IBM Plex Mono latin';

const W = 1200;
const H = 630;
const SITE = 'beda.lol';

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

async function loadFonts() {
  const require = createRequire(join(repoRoot, 'packages/tokens/package.json'));
  const file = (pkg: string, name: string) =>
    readFile(require.resolve(`@fontsource/${pkg}/files/${name}`));
  // Fontsource splits fonts by subset; satori does not merge same-named
  // fonts, so each subset gets its own name and styles list both.
  const fonts = [];
  for (const subset of ['latin', 'cyrillic']) {
    fonts.push(
      {
        name: `Playfair Display ${subset}`,
        weight: 900 as const,
        style: 'normal' as const,
        data: await file('playfair-display', `playfair-display-${subset}-900-normal.woff`),
      },
      {
        name: `IBM Plex Sans ${subset}`,
        weight: 400 as const,
        style: 'normal' as const,
        data: await file('ibm-plex-sans', `ibm-plex-sans-${subset}-400-normal.woff`),
      },
      {
        name: `IBM Plex Mono ${subset}`,
        weight: 500 as const,
        style: 'normal' as const,
        data: await file('ibm-plex-mono', `ibm-plex-mono-${subset}-500-normal.woff`),
      },
    );
  }
  return fonts;
}

// The board: the same geometry as the site's transom at 1em = EM px.
const EM = 92;
const SLOT_W = 0.75 * EM;
const SLOT_H = 1.07 * EM;
const GAP = 0.1 * EM;
const PAD_X = 0.4 * EM;
const PAD_TOP = 0.46 * EM;
const PAD_BOTTOM = 0.5 * EM;
const NAIL = 0.072 * EM;
const BOARD_W = 6 * SLOT_W + 5 * GAP + 2 * PAD_X;
const BOARD_H = PAD_TOP + SLOT_H + PAD_BOTTOM;
const SHELF_GAP = 0.52 * EM;

function glyph(letter: string, color: string, extra: Record<string, unknown> = {}): Node {
  return h(
    'div',
    {
      position: 'absolute',
      left: 0,
      top: 0,
      width: SLOT_W,
      height: SLOT_H,
      display: 'flex',
      justifyContent: 'center',
      fontFamily: DISPLAY,
      fontWeight: 900,
      fontSize: EM,
      lineHeight: `${SLOT_H}px`,
      color,
      ...extra,
    },
    letter,
  );
}

function transom(nails: number[]): Node {
  const slots = WORD.map((letter, i) => {
    const count = nails[i] ?? 4;
    const m = mountFor(letter);
    const [ox, oy] = m.pts[0];
    const origin = `${ox * EM}px ${oy * EM}px`;
    const children: Node[] = [glyph(letter, C.plankHi)];
    const shadow = `0 ${0.025 * EM}px 0 ${C.glyphShadow}`;
    if (count >= 2) {
      children.push(glyph(letter, C.brass, { textShadow: shadow }));
    } else if (count === 1) {
      children.push(
        glyph(letter, C.brass, {
          textShadow: shadow,
          transform: `rotate(${m.hang}deg)`,
          transformOrigin: origin,
        }),
      );
    } else {
      children.push(
        glyph(letter, C.brass, {
          textShadow: shadow,
          transform: `translate(${fallX(i) * EM}px, ${1.12 * EM}px) rotate(${fallRotation(i)}deg)`,
          transformOrigin: origin,
        }),
      );
    }
    m.pts.forEach(([x, y], k) => {
      const on = k < count;
      const size = on ? NAIL : NAIL * 0.72;
      children.push(
        h('div', {
          position: 'absolute',
          left: x * EM - size / 2,
          top: y * EM - size / 2,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: on ? C.brassHi : C.hole,
        }),
      );
    });
    return h(
      'div',
      { position: 'relative', display: 'flex', width: SLOT_W, height: SLOT_H },
      children,
    );
  });

  const board = h(
    'div',
    {
      display: 'flex',
      gap: GAP,
      padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
      width: BOARD_W,
      height: BOARD_H,
      backgroundImage: `repeating-linear-gradient(180deg, ${C.plank} 0px, ${C.plank} ${0.4 * EM}px, ${C.seam} ${0.4 * EM}px, ${C.seam} ${0.42 * EM}px)`,
      borderRadius: `${0.09 * EM}px ${0.09 * EM}px ${1.4 * EM}px ${1.4 * EM}px / ${0.09 * EM}px ${0.09 * EM}px ${0.75 * EM}px ${0.75 * EM}px`,
      boxShadow: `inset 0 -${0.15 * EM}px ${0.25 * EM}px rgba(0,0,0,0.35), inset 0 ${0.05 * EM}px 0 ${C.plankHi}`,
    },
    slots,
  );
  const shelf = h('div', {
    display: 'flex',
    width: Math.min(7 * EM, BOARD_W + 60),
    height: 0.55 * EM,
    marginTop: SHELF_GAP,
    borderTop: `${0.09 * EM}px solid ${C.shelf}`,
    backgroundColor: C.hull,
  });
  return h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' }, [
    board,
    shelf,
  ]);
}

function card(nails: number[], kicker: string, title: string, line: string): Node {
  return h(
    'div',
    {
      width: W,
      height: H,
      display: 'flex',
      alignItems: 'center',
      gap: 48,
      padding: '48px 64px',
      backgroundColor: C.tar,
      color: C.text,
      fontFamily: SANS,
    },
    [
      h('div', { display: 'flex', width: 580, justifyContent: 'center' }, [transom(nails)]),
      h('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: 1, gap: 20 }, [
        h(
          'div',
          { fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: C.muted },
          kicker,
        ),
        h('div', { fontFamily: DISPLAY, fontWeight: 900, fontSize: 56, lineHeight: 1.04 }, title),
        h('div', { fontSize: 24, lineHeight: 1.4, color: C.text2 }, line),
        h('div', { marginTop: 20, fontFamily: MONO, fontSize: 22, color: C.brass }, SITE),
      ]),
    ],
  );
}

/** «Флагман» → «флагман», «Классическая «Беда»» → «классическая «Беда»». */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type Fonts = Awaited<ReturnType<typeof loadFonts>>;

async function render(node: Node, fonts: Fonts): Promise<Buffer> {
  // biome-ignore lint/suspicious/noExplicitAny: satori takes a React-like element tree
  const svg = await satori(node as any, { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  return sharp(png).png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 }).toBuffer();
}

async function main() {
  const { values } = parseArgs({
    options: { codes: { type: 'string' }, out: { type: 'string' } },
  });
  const out = resolve(values.out ?? join(webRoot, 'public/og'));
  const codes = values.codes ? values.codes.split(',') : allCodes();
  const fonts = await loadFonts();
  const started = performance.now();
  let bytes = 0;

  await mkdir(join(out, 'osmotr'), { recursive: true });
  // A few renders in flight: sharp encodes on libuv threads while satori lays out the next card.
  const queue = [...codes];
  const worker = async () => {
    for (let code = queue.shift(); code; code = queue.shift()) {
      const states = decode(code);
      if (!states) throw new Error(`bad code ${code}`);
      const nails = statesToNails(states as LetterState[]);
      const cls = classify(nails);
      const png = await render(
        card(
          nails,
          'ОСМОТР СУДНА',
          `У меня — ${lowerFirst(cls.title)}`,
          'ПО есть. Победы нет. А у тебя?',
        ),
        fonts,
      );
      bytes += png.length;
      await writeFile(join(out, 'osmotr', `${code}.png`), png);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  if (!values.codes) {
    const home = await render(
      card(
        [1, 0, 4, 4, 4, 4],
        'ЯХТА «БЕДА»',
        'ПО у тебя есть. Победы нет.',
        'Рубрика о пет-проектах, которые плывут без маркетинга.',
      ),
      fonts,
    );
    bytes += home.length;
    await writeFile(join(out, 'default.png'), home);

    await mkdir(join(out, 'bukvy'), { recursive: true });
    const dir = join(webRoot, 'src/content/pillars');
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.md'))) {
      const text = await readFile(join(dir, file), 'utf8');
      const letter = /^letter:\s*(\S+)/m.exec(text)?.[1] ?? '';
      const title = /^title:\s*'(.+)'$/m.exec(text)?.[1] ?? '';
      const i = WORD.indexOf(letter as (typeof WORD)[number]);
      // The article's letter hangs; the rest stay nailed.
      const nails = WORD.map((_, k) => (k === i ? 1 : 4));
      const [head, tail] = title.split(': ');
      const png = await render(card(nails, 'БУКВЫ ПОБЕДЫ', head ?? title, tail ?? ''), fonts);
      bytes += png.length;
      await writeFile(join(out, 'bukvy', file.replace(/\.md$/, '.png')), png);
    }
  }

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(
    `og: ${codes.length} result images${values.codes ? '' : ' + default + articles'} in ${seconds}s, ${(bytes / 1024 / 1024).toFixed(1)} MB → ${out}`,
  );
}

await main();
