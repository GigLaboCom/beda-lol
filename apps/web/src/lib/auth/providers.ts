/**
 * The OAuth sign-in providers the site knows, in button order. Supabase ids; the X one is
 * Supabase's `x` (OAuth 2.0), not the legacy `twitter`. Adding one: an entry here, its
 * `[auth.external.<id>]` in `supabase/config.toml`, and a `<ID>_CLIENT_ID` / `<ID>_SECRET`
 * pair in `deploy/scripts/supabase-setup.sh`.
 */
export const OAUTH_PROVIDERS = ['github', 'google', 'x'] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** Brand names, the same in every language. */
export const PROVIDER_NAMES: Record<OAuthProvider, string> = {
  github: 'GitHub',
  google: 'Google',
  x: 'X',
};

export function isOAuthProvider(id: string): id is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(id);
}

/**
 * `BEDA_AUTH_PROVIDERS` (`github,google,x`): the buttons to show, which must match the
 * providers enabled in Supabase (`supabase-setup.sh` writes the value). Unknown ids and
 * repeats are dropped; the order is the site's, not the variable's.
 */
export function parseProviders(raw: string): OAuthProvider[] {
  const wanted = new Set(raw.split(',').map((id) => id.trim().toLowerCase()));
  return OAUTH_PROVIDERS.filter((id) => wanted.has(id));
}
