/**
 * What `/kabinet` shows, or where it sends the visitor instead. Shared by the ru and en
 * route files, which only turn a `redirect` into `Astro.redirect`.
 */
import type { Locale } from '../../i18n';
import { cabinetPath, signInHref } from './routes';
import { apiFromServer } from './server';

/** The part of `GET /api/me` the cabinet shows. */
export interface Me {
  id: string;
  display_name: string;
  role: 'user' | 'moderator' | 'admin';
}

export interface Cabinet {
  email: string | null;
  providers: string[];
  /** `null` when the API did not answer: the page says so and still offers sign-out. */
  me: Me | null;
}

export async function loadCabinet(
  locals: App.Locals,
  lang: Locale,
): Promise<{ redirect: string } | { cabinet: Cabinet }> {
  const back = signInHref(lang, cabinetPath(lang));
  if (!locals.auth) return { redirect: back };
  const me = await apiFromServer<Me>(locals, '/api/me');
  if (me.status === 401) {
    // A token that is still unexpired, for a user who is gone (deleted elsewhere).
    await locals.supabase?.auth.signOut({ scope: 'local' });
    return { redirect: back };
  }
  return {
    cabinet: {
      email: locals.auth.email,
      providers: locals.auth.providers,
      me: me.status === 200 ? me.body : null,
    },
  };
}
