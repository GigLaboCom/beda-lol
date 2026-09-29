/**
 * Server side of Supabase Auth (amendment П-1): the session lives in cookies
 * managed by `@supabase/ssr`; on-demand pages read it in the middleware and
 * call the Rust API with the access token as a bearer header.
 */
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { type AuthConfig, apiBaseUrl } from './config';

export function serverClient(
  cfg: AuthConfig,
  request: Request,
  cookies: AstroCookies,
  responseHeaders: Headers,
) {
  return createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(toSet, headers) {
        for (const { name, value, options } of toSet) cookies.set(name, value, options);
        // Cache-Control and friends: a response that sets session cookies must not be cached.
        for (const [key, value] of Object.entries(headers)) responseHeaders.set(key, value);
      },
    },
  });
}

/**
 * Calls the Rust API from the server as the signed-in user (or anonymously).
 * Returns the parsed JSON and the status; never throws on HTTP errors.
 */
export async function apiFromServer<T = unknown>(
  locals: App.Locals,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T | null }> {
  const headers = new Headers(init.headers);
  if (locals.auth) headers.set('authorization', `Bearer ${locals.auth.accessToken}`);
  try {
    const res = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers });
    const text = await res.text();
    return { status: res.status, body: text ? (JSON.parse(text) as T) : null };
  } catch {
    return { status: 503, body: null };
  }
}
