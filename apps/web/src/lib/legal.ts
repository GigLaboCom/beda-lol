import { type CollectionEntry, getEntry } from 'astro:content';
import type { Locale } from '../i18n';

export type LegalPage = CollectionEntry<'legal'>['data']['page'];
export type LegalEntry = CollectionEntry<'legal'>;

/** The legal pages live at the root: `/pravila`, `/konfidencialnost`, `/cookies`. */
export const legalPath = (page: LegalPage) => `/${page}`;

/** The entry of `page` in `lang` (`src/content/legal/<lang>/<page>.md`). */
export async function legalEntry(page: LegalPage, lang: Locale): Promise<LegalEntry> {
  const entry = await getEntry('legal', `${lang}/${page}`);
  if (!entry) throw new Error(`no legal page ${lang}/${page}`);
  return entry;
}
