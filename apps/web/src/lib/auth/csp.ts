import type { AstroGlobal } from 'astro';
import type { AuthConfig } from './config';

/** Where Turnstile's script and its challenge frame come from. */
export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

/**
 * Opens a sign-in page's CSP for what it talks to: supabase-js calls Supabase Auth
 * directly, and the Turnstile widget (when on) loads a script and a frame.
 */
export function allowSignIn(csp: AstroGlobal['csp'], cfg: AuthConfig): void {
  csp?.insertDirective(`connect-src 'self' ${new URL(cfg.url).origin}`);
  if (!cfg.turnstile) return;
  // An inserted source replaces Astro's default 'self', which the island scripts need.
  csp?.insertScriptResource("'self'");
  csp?.insertScriptResource(TURNSTILE_ORIGIN);
  csp?.insertDirective(`frame-src ${TURNSTILE_ORIGIN}`);
}
