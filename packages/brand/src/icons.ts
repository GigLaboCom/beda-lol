/**
 * Every icon beda.lol advertises, in one place.
 *
 * `scripts/generate-icons.ts` renders the files from `tile.svg` into
 * `apps/web/public/`; this module is the other half of that contract — which
 * files exist, and which of them the layout (`Base.astro`) and the web app
 * manifest (`/manifest.webmanifest`) point at. `icons.test.ts` asserts that
 * every URL named here exists and is up to date, so adding one without
 * regenerating fails the suite.
 */

/** `--tar`: the tile's background and the page background (light scheme). */
export const BRAND_BACKGROUND = '#1c140e';
/** `--tar` under the dark scheme. */
export const BRAND_BACKGROUND_DARK = '#17100a';
/** `--brass`: the mark's colour. Safari's mask icon wants a hex value. */
export const BRAND_COLOR = '#d6a93e';

/** Which drawing a file is rendered from (see `tile.ts`). */
export type IconSource = 'tile' | 'square' | 'maskable' | 'mark' | 'mono';

export interface RasterIcon {
  file: string;
  size: number;
  source: IconSource;
}

const square = (prefix: string, source: IconSource, sizes: readonly number[]): RasterIcon[] =>
  sizes.map((size) => ({ file: `${prefix}-${size}x${size}.png`, size, source }));

/** Classic favicons: bookmarks, history, and browsers without SVG favicons. */
const FAVICON_SIZES = [16, 32, 48, 96, 192, 256, 512] as const;
/** Android / Chrome home screen via the manifest. */
const ANDROID_SIZES = [36, 48, 72, 96, 144, 192, 256, 512] as const;
/** Android adaptive icons (`purpose: "maskable"`). */
const MASKABLE_SIZES = [192, 512] as const;
/** iOS / iPadOS home screen: 180 for modern iPhones, 152 and 167 for iPads. */
const APPLE_SIZES = [180, 167, 152] as const;
/** Windows pinned tiles (browserconfig.xml). */
const MSTILE_SIZES = [70, 150, 310] as const;
/** Sizes packed into favicon.ico, smallest first. */
export const ICO_SIZES = [16, 32, 48] as const;

export const rasterIcons: readonly RasterIcon[] = [
  ...square('favicon', 'tile', FAVICON_SIZES),
  ...square('android-chrome', 'tile', ANDROID_SIZES),
  ...square('maskable-icon', 'maskable', MASKABLE_SIZES),
  ...square('apple-touch-icon', 'square', APPLE_SIZES),
  ...square('mstile', 'square', MSTILE_SIZES),
];

export interface VectorIcon {
  file: string;
  source: IconSource;
}

export const vectorIcons: readonly VectorIcon[] = [
  { file: 'favicon.svg', source: 'tile' },
  { file: 'safari-pinned-tab.svg', source: 'mono' },
  // The bare mark for embeds and future brand work; not linked from pages.
  { file: 'logo.svg', source: 'mark' },
];

/** `apple-touch-icon.png` without a size is what iOS probes for when no tag matches. */
export const aliases: readonly (readonly [from: string, to: string])[] = [
  ['apple-touch-icon-180x180.png', 'apple-touch-icon.png'],
];

export const BROWSERCONFIG = 'browserconfig.xml';

/** `<link>` tags for the document head, in order. */
export interface HeadLink {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
  color?: string;
}

export const headLinks: readonly HeadLink[] = [
  // SVG first: browsers that understand it stop here and stay sharp at any density.
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  {
    rel: 'icon',
    href: '/favicon.ico',
    sizes: ICO_SIZES.map((s) => `${s}x${s}`).join(' '),
    type: 'image/x-icon',
  },
  ...FAVICON_SIZES.map((size) => ({
    rel: 'icon',
    href: `/favicon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
  })),
  ...APPLE_SIZES.map((size) => ({
    rel: 'apple-touch-icon',
    href: size === 180 ? '/apple-touch-icon.png' : `/apple-touch-icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
  })),
  { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: BRAND_COLOR },
  { rel: 'manifest', href: '/manifest.webmanifest' },
];

/** `<meta>` tags for the document head. */
export interface HeadMeta {
  name: string;
  content: string;
  media?: string;
}

export const headMeta: readonly HeadMeta[] = [
  { name: 'theme-color', content: BRAND_BACKGROUND, media: '(prefers-color-scheme: light)' },
  { name: 'theme-color', content: BRAND_BACKGROUND_DARK, media: '(prefers-color-scheme: dark)' },
  { name: 'msapplication-TileColor', content: BRAND_BACKGROUND },
  { name: 'msapplication-config', content: `/${BROWSERCONFIG}` },
];

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: 'image/png';
  purpose: 'any' | 'maskable';
}

export const manifestIcons: readonly ManifestIcon[] = [
  ...ANDROID_SIZES.map((size) => ({
    src: `/android-chrome-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png' as const,
    purpose: 'any' as const,
  })),
  ...MASKABLE_SIZES.map((size) => ({
    src: `/maskable-icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png' as const,
    purpose: 'maskable' as const,
  })),
];

/** Windows tile configuration, referenced by `msapplication-config`. */
export function browserconfigXml(): string {
  const [small, medium, large] = MSTILE_SIZES.map((s) => `/mstile-${s}x${s}.png`);
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by packages/brand (task brand:icons). Do not edit. -->
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="${small}"/>
      <square150x150logo src="${medium}"/>
      <square310x310logo src="${large}"/>
      <TileColor>${BRAND_BACKGROUND}</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`;
}
