/**
 * Supabase Auth settings, read at runtime on the server (the production image
 * is built once and configured by `/opt/beda/.env`). `BEDA_SUPABASE_URL` is the
 * same variable the Rust API reads. Without both values the site runs with
 * auth off: no session is read and sign-in pages say so.
 */
export interface AuthConfig {
  /** Supabase project URL, reachable from the browser. */
  url: string;
  /** Publishable (anon) key: public by design (amendment П-1, rule 5). */
  key: string;
}

export function authConfig(): AuthConfig | null {
  const url = process.env.BEDA_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.BEDA_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

/** Where the server reaches the Rust API (in prod compose: `http://api:8080`). */
export function apiBaseUrl(): string {
  return (process.env.BEDA_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
}

/** A same-site path to go to after sign-in; anything else becomes `/`. */
export function safeNext(next: string | null | undefined): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
