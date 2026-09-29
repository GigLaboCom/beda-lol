/**
 * Reads the Supabase session for on-demand pages (prerendered pages have no
 * request and skip this). `locals.auth` is the signed-in user with a verified
 * token, or null; `locals.supabase` is the request's server client.
 */
import { defineMiddleware } from 'astro:middleware';
import { authConfig } from './lib/auth/config';
import { serverClient } from './lib/auth/server';

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.auth = null;
  ctx.locals.supabase = null;
  const cfg = ctx.isPrerendered ? null : authConfig();
  if (!cfg) return next();

  const responseHeaders = new Headers();
  const supabase = serverClient(cfg, ctx.request, ctx.cookies, responseHeaders);
  ctx.locals.supabase = supabase;
  // getClaims verifies the token (against the project JWKS) and refreshes an
  // expired session; getSession alone would trust the cookie as it is.
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      ctx.locals.auth = {
        userId: data.claims.sub,
        email: typeof data.claims.email === 'string' ? data.claims.email : null,
        accessToken: session.session.access_token,
      };
    }
  }

  const response = await next();
  responseHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
});
