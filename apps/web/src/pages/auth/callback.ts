/**
 * End of a sign-in: the magic link (and later GitHub, S17) comes back here with
 * a PKCE `code`; exchanging it sets the session cookies. Then on to `next`.
 */
import type { APIRoute } from 'astro';
import { safeNext } from '../../lib/auth/config';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  if (code && locals.supabase) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirect(next, 303);
  }
  const back = new URL(next, url);
  back.searchParams.set('auth', 'failed');
  return redirect(`${back.pathname}${back.search}`, 303);
};
