/**
 * Google Analytics 4, off unless the server has `BEDA_GA_ID` (web.env).
 *
 * Every page loads `/analytics.js` (an on-demand route, so the id is read at runtime and a
 * local stack never reports to the real property). With an id it sets up gtag with Consent
 * Mode v2 denied by default, turns GA's own page view off and loads gtag.js; without one it
 * is empty, and then nothing below does anything and no banner is shown: nothing is stored
 * that a visitor could refuse.
 *
 * Events go through `trackEvent` only, so each carries the locale and the utm tags. Never
 * send a typed name, an email or anything else a visitor wrote.
 */
import { DEFAULT_CONSENT } from './consent';

export const ANALYTICS_SCRIPT_PATH = '/analytics.js';
export const GTAG_ORIGIN = 'https://www.googletagmanager.com';
/** What gtag talks to, for the CSP (Google's list for GA4). */
export const GA_CONNECT = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.googletagmanager.com',
];
export const GA_IMG = ['https://*.google-analytics.com', 'https://*.googletagmanager.com'];

/** A GA4 measurement id (`G-XXXXXXXXXX`), or null for unset or malformed. */
export function analyticsId(raw: string | undefined): string | null {
  const id = raw?.trim().toUpperCase() ?? '';
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}

/** The body of `/analytics.js`. */
export function analyticsScript(id: string | null): string {
  if (!id) return '/* analytics off */\n';
  const lines = [
    '(function () {',
    '  var w = window;',
    '  w.dataLayer = w.dataLayer || [];',
    '  function gtag() { w.dataLayer.push(arguments); }',
    '  w.gtag = gtag;',
    `  gtag('consent', 'default', ${JSON.stringify({ ...DEFAULT_CONSENT, wait_for_update: 500 })});`,
    "  gtag('set', 'ads_data_redaction', true);",
    "  gtag('js', new Date());",
    `  gtag('config', ${JSON.stringify(id)}, { send_page_view: false });`,
    `  w.bedaAnalytics = { id: ${JSON.stringify(id)} };`,
    "  var s = document.createElement('script');",
    '  s.async = true;',
    `  s.src = ${JSON.stringify(`${GTAG_ORIGIN}/gtag/js?id=${encodeURIComponent(id)}`)};`,
    '  document.head.appendChild(s);',
    '})();',
  ];
  return `${lines.join('\n')}\n`;
}

/** True once `/analytics.js` has set gtag up. */
export function analyticsOn(): boolean {
  return (
    typeof window !== 'undefined' && !!window.bedaAnalytics && typeof window.gtag === 'function'
  );
}

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {},
): void {
  if (!analyticsOn()) return;
  const search = new URLSearchParams(location.search);
  const utm = Object.fromEntries(UTM.flatMap((k) => (search.get(k) ? [[k, search.get(k)]] : [])));
  window.gtag?.('event', name, {
    locale: document.documentElement.lang || 'ru',
    ...utm,
    ...params,
  });
}

export function trackPageView(): void {
  trackEvent('page_view', { page_location: location.href, page_title: document.title });
}
