import type { APIRoute } from 'astro';
import { analyticsId, analyticsScript } from '../lib/analytics';

/**
 * `/analytics.js`, loaded by every page (`Base.astro`): the GA4 bootstrap for BEDA_GA_ID, read
 * at runtime, or an empty script without it. Short cache, so a changed id is live in minutes.
 */
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(analyticsScript(analyticsId(process.env.BEDA_GA_ID)), {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
