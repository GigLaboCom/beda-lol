/**
 * Sign-out as a plain form POST (works without JS): `scope=local` ends this browser's
 * session, `scope=global` every session of the user (Supabase revokes the refresh tokens;
 * other devices drop out at their next refresh). Astro's origin check guards the POST.
 */
import type { APIRoute } from 'astro';
import { safeNext } from '../../lib/auth/config';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const scope = form.get('scope') === 'global' ? 'global' : 'local';
  const next = safeNext(form.get('next')?.toString());
  await locals.supabase?.auth.signOut({ scope });
  return redirect(next, 303);
};
