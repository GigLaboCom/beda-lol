/**
 * Browser side of Supabase Auth: supabase-js is used only to sign in and to
 * read the access token (amendment П-1, rule 1); every data call goes to the
 * Rust API with that token in the `Authorization` header (rule 3). The client
 * keeps the session in cookies, so the server sees the same session.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthConfig } from './config';

let client: SupabaseClient | null = null;

export function browserClient(cfg: AuthConfig): SupabaseClient {
  client ??= createBrowserClient(cfg.url, cfg.key);
  return client;
}

/** `fetch` to the Rust API with the current access token, if there is a session. */
export async function apiFetch(
  cfg: AuthConfig,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await browserClient(cfg).auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set('authorization', `Bearer ${data.session.access_token}`);
  return fetch(path, { ...init, headers, credentials: 'same-origin' });
}
