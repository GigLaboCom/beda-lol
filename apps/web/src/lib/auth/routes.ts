/**
 * Where sign-in lives and where it leads. The pages (`/voiti`, `/kabinet`), the header and
 * the form endpoints under `/auth/` all build their links here.
 */
import { getLocalizedPath, type Locale } from '../../i18n';
import { safeNext } from './config';

export const SIGN_IN_PATH = '/voiti';
export const CABINET_PATH = '/kabinet';

export const signInPath = (lang: Locale) => getLocalizedPath(SIGN_IN_PATH, lang);
export const cabinetPath = (lang: Locale) => getLocalizedPath(CABINET_PATH, lang);

/** The sign-in page, coming back to `next` afterwards (the cabinet when `next` is absent). */
export function signInHref(lang: Locale, next?: string | null): string {
  const page = signInPath(lang);
  if (!next || next === page) return page;
  return `${page}?${new URLSearchParams({ next })}`;
}

/** Where a signed-in visitor of the sign-in page goes: its `next`, or the cabinet. */
export function afterSignIn(url: URL, lang: Locale): string {
  return safeNext(url.searchParams.get('next'), cabinetPath(lang));
}
