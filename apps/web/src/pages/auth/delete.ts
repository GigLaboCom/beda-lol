/**
 * «Удалить аккаунт» from the cabinet, as a form POST. The Rust API anonymises the user's
 * records and deletes the user through the Supabase Admin API (`DELETE /api/me`); then the
 * session cookies are cleared here. Astro's origin check guards the POST.
 */
import type { APIRoute } from 'astro';
import { defaultLocale, type Locale, locales } from '../../i18n';
import { cabinetPath, signInPath } from '../../lib/auth/routes';
import { apiFromServer } from '../../lib/auth/server';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const asked = form.get('lang')?.toString();
  const lang: Locale = locales.find((l) => l === asked) ?? defaultLocale;
  if (!locals.auth) return redirect(signInPath(lang), 303);
  if (form.get('confirm') !== 'yes') return redirect(`${cabinetPath(lang)}?delete=failed`, 303);

  const res = await apiFromServer(locals, '/api/me', { method: 'DELETE' });
  if (res.status !== 204) return redirect(`${cabinetPath(lang)}?delete=failed`, 303);
  // The user is gone on the Auth side, so the remote call fails; the cookies are cleared anyway.
  await locals.supabase?.auth.signOut({ scope: 'local' });
  return redirect(`${signInPath(lang)}?account=deleted`, 303);
};
