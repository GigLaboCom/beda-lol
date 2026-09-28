/** Locales the site ships. Russian is the source language and the default. */
export type Locale = 'ru' | 'en';

export const DEFAULT_LOCALE: Locale = 'ru';

/** Narrows any string to a known {@link Locale}, falling back to the default. */
export function asLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : 'ru';
}
