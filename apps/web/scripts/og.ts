/**
 * Prebuilds share images (1200×630 PNG) from the ShareCard design:
 *   public/og/osmotr/<code>.png  — all 729 quiz results
 *   public/og/default.png        — home page
 *   public/og/bukvy/<slug>.png   — one per pillar article
 *
 * satori lays the card out and turns text into paths; the board is the site's
 * SVG from renderTransom (standalone, colours from packages/tokens) embedded as
 * an image; resvg renders the SVG;
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
import {
  allCodes,
  classify,
  decode,
  HERO_STEPS,
  type LetterState,
  statesToNails,
  WORD,
} from '@beda/core';
import { readTokens } from '@beda/tokens/read';
import { BOARD_HEIGHT_EM, boardWidthEm, renderTransom } from '@beda/transom';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');
const repoRoot = resolve(webRoot, '../..');

// The site's base (dark-first) palette, straight from packages/tokens.
const T = readTokens();

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

// The board is the site's own SVG (renderTransom), embedded as an image.
const BOARD_BOX = 580;

function transom(nails: number[]): Node {
  const svg = renderTransom({ letters: WORD, nails, idPrefix: 'og-', standalone: { palette: T } });
  const em = BOARD_BOX / boardWidthEm(WORD);
  return {
    type: 'img',
    props: {
      src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      width: Math.round(BOARD_BOX),
      height: Math.round(BOARD_HEIGHT_EM * em),
      style: {},
    },
  };
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
      backgroundColor: T.tar,
      color: T.text,
      fontFamily: SANS,
    },
    [
      h('div', { display: 'flex', width: BOARD_BOX, justifyContent: 'center' }, [transom(nails)]),
      h('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: 1, gap: 20 }, [
        h(
          'div',
          { fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: T.muted },
          kicker,
        ),
        h('div', { fontFamily: DISPLAY, fontWeight: 900, fontSize: 56, lineHeight: 1.04 }, title),
        h('div', { fontSize: 24, lineHeight: 1.4, color: T['text-2'] }, line),
        h('div', { marginTop: 20, fontFamily: MONO, fontSize: 22, color: T.brass }, SITE),
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
        [...(HERO_STEPS.at(-1) ?? [])],
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
