/**
 * Locale configuration. Russian is the default and stays unprefixed; English
 * lives under `/en/`. Modelled on the lookbook site's i18n setup, but with
 * Russian as the default because beda.lol is Russian-first.
 */
export const defaultLocale = 'ru';
export const locales = ['ru', 'en'] as const;
export type Locale = (typeof locales)[number];

/** Name of each language in its own language, for the switcher. */
export const localeLabels: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
};

/** Short code shown in the compact switcher. */
export const localeShort: Record<Locale, string> = {
  ru: 'RU',
  en: 'EN',
};

/** Value for the `og:locale` meta and JSON-LD `inLanguage`. */
export const ogLocale: Record<Locale, string> = {
  ru: 'ru_RU',
  en: 'en_US',
};

/** BCP-47 tag for `hreflang`, `<html lang>` and sitemaps. */
export const htmlLang: Record<Locale, string> = {
  ru: 'ru',
  en: 'en',
};
