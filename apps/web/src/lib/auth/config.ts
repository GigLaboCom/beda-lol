import { OAUTH_PROVIDERS, type OAuthProvider, parseProviders } from './providers';

/**
 * Supabase Auth settings, read at runtime on the server (the production image
 * is built once and configured by `/opt/beda/web.env`). `BEDA_SUPABASE_URL` is the
 * same variable the Rust API reads. Without both values the site runs with
 * auth off: no session is read and sign-in pages say so.
 */
export interface AuthConfig {
  /** Supabase project URL, reachable from the browser. */
  url: string;
  /** Publishable (anon) key: public by design (amendment П-1, rule 5). */
  key: string;
  /**
   * Turnstile site key (public). Set when Supabase Auth has CAPTCHA on: e-mail sign-in
   * then sends a Turnstile token. `null` hides the widget.
   */
  turnstile: string | null;
  /**
   * OAuth buttons, from `BEDA_AUTH_PROVIDERS`. Unset: every provider in dev (the local
   * stack enables them all in `supabase/config.toml`), none in production.
   */
  providers: OAuthProvider[];
}

/**
 * Cloudflare's always-passing test site key. It pairs with the test secret in
 * `supabase/config.toml`, so `astro dev` against the local stack needs no setup.
 */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

export function authConfig(dev = import.meta.env.DEV): AuthConfig | null {
  const url = process.env.BEDA_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.BEDA_SUPABASE_PUBLISHABLE_KEY?.trim();
  const turnstile =
    process.env.BEDA_TURNSTILE_SITE_KEY?.trim() || (dev ? TURNSTILE_TEST_SITE_KEY : null);
  const listed = process.env.BEDA_AUTH_PROVIDERS;
  const providers =
    listed === undefined ? (dev ? [...OAUTH_PROVIDERS] : []) : parseProviders(listed);
  return url && key ? { url, key, turnstile, providers } : null;
}

/** Where the server reaches the Rust API (in prod compose: `http://api:8080`). */
export function apiBaseUrl(): string {
  return (process.env.BEDA_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
}

/** A same-site path to go to after sign-in; anything else becomes `fallback`. */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
