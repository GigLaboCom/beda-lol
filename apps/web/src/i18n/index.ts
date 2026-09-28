/**
 * i18n entry point. Astro components read the locale from the URL
 * (`getLangFromUrl(Astro.url)`) and build a bound `t` with `useTranslations`,
 * so existing `t('key')` call sites stay unchanged. Islands receive `lang` as
 * a prop and do the same.
 */
import { defaultLocale, type Locale, locales } from './config';
import { type Key, ui } from './ui';

export {
  defaultLocale,
  htmlLang,
  type Locale,
  localeLabels,
  localeShort,
  locales,
  ogLocale,
} from './config';
export type { Key };

const localeSet = new Set<string>(locales);

/** The locale from a URL: the first path segment if it is a known locale, else the default. */
export function getLangFromUrl(url: URL): Locale {
  const segment = url.pathname.split('/')[1] ?? '';
  return localeSet.has(segment) ? (segment as Locale) : defaultLocale;
}

/** A `t(key)` bound to `lang`, falling back to the default locale for any missing string. */
export function useTranslations(lang: Locale) {
  return function t(key: Key): string {
    return ui[lang][key] ?? ui[defaultLocale][key];
  };
}

/** Look up one key directly for a locale. */
export function translate(lang: Locale, key: Key): string {
  return ui[lang][key] ?? ui[defaultLocale][key];
}

/**
 * Prefix a default-locale path for `lang`: `'/osmotr'` stays `'/osmotr'` for ru
 * and becomes `'/en/osmotr'` for en. `'/'` becomes `'/en'`.
 */
export function getLocalizedPath(path: string, lang: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === defaultLocale) return clean;
  return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}

/** Strip a locale prefix, returning the equivalent default-locale path. */
export function stripLocale(path: string): string {
  for (const l of locales) {
    if (l === defaultLocale) continue;
    if (path === `/${l}`) return '/';
    if (path.startsWith(`/${l}/`)) return path.slice(l.length + 1);
  }
  return path || '/';
}

/** Fills `{name}` slots: `fmt(t('quiz.count'), { n: 3 })`. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** Placeholder values like `[ссылка на канал]` are not real URLs yet. */
export function isPlaceholder(value: string): boolean {
  return value.startsWith('[') && value.endsWith(']');
}
