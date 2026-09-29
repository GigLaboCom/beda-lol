/**
 * Cookie consent, the same flow as the sibling GigLabo sites (lookbook, stereola, moat-atlas):
 * Google Consent Mode v2 with everything but security denied until a choice is made; the
 * choice lives in localStorage; a region check decides whether to ask at all.
 *
 * The region check is `/api-shared/ip` on this origin: Caddy hands it to the GigLabo shared
 * service, which reads the visitor's address from the connection, looks it up and answers
 * `{ status: 'OK', ip: { isEu } }` (or `{ status: 'FAIL' }`). Only that boolean reaches the
 * page. EU visitors get the banner; so does everyone the check cannot place (FAIL, 404, a
 * timeout): failing the other way would grant consent for Europeans. Elsewhere the choice is
 * granted automatically and can be changed on `/cookies`.
 *
 * Everything that needs consent is one category here. Add a category by adding a key to
 * `CATEGORIES` (its Consent Mode fields and cookies), its copy in the dictionary
 * (`consent.cat.<id>`, `consent.cat.<id>.desc`) and its rows on the cookie page.
 */

/** Consent Mode v2 fields, as gtag names them. */
export type ConsentField =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';
export type ConsentParams = Record<ConsentField, 'granted' | 'denied'>;

/**
 * Optional categories: the Consent Mode fields each one opens, and the cookies it leaves behind
 * (removed when it is refused, since gtag stops writing them but does not delete them). The
 * site shows no ads.
 */
export const CATEGORIES = {
  analytics: { fields: ['analytics_storage'], cookies: /^_ga(_|$)/ },
} as const satisfies Record<string, { fields: readonly ConsentField[]; cookies: RegExp }>;

export type Category = keyof typeof CATEGORIES;
export type Choice = Record<Category, boolean>;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];

/** The choice record (localStorage) and the region verdict for this tab (sessionStorage). */
export const CONSENT_KEY = 'beda-consent';
export const REGION_KEY = 'beda-region';
const CONSENT_VERSION = 1;

export const GEO_ENDPOINT = '/api-shared/ip';
const GEO_TIMEOUT_MS = 3000;

/** Fired on `document` whenever the choice changes, so every control on the page follows. */
export const CONSENT_EVENT = 'beda:consent';

export interface ConsentRecord {
  v: number;
  choice: Choice;
  /** ISO time of the choice. */
  at: string;
  /** `auto` when granted without asking (outside the EU). */
  how: 'banner' | 'settings' | 'auto';
}

const every = (value: boolean): Choice =>
  Object.fromEntries(CATEGORY_IDS.map((id) => [id, value])) as Choice;
export const grantAll = (): Choice => every(true);
export const denyAll = (): Choice => every(false);

/** Before any choice: only what keeps the site secure. */
export const DEFAULT_CONSENT: ConsentParams = consentParams(denyAll());

export function consentParams(choice: Choice): ConsentParams {
  const params: ConsentParams = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
  };
  for (const id of CATEGORY_IDS) {
    if (choice[id]) for (const field of CATEGORIES[id].fields) params[field] = 'granted';
  }
  return params;
}

/** A stored record, or null for none, an old version or anything malformed. */
export function parseRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ConsentRecord>;
    if (value?.v !== CONSENT_VERSION || typeof value.choice !== 'object' || !value.choice) {
      return null;
    }
    const choice = {} as Choice;
    for (const id of CATEGORY_IDS) {
      const on = (value.choice as Record<string, unknown>)[id];
      if (typeof on !== 'boolean') return null;
      choice[id] = on;
    }
    return { v: CONSENT_VERSION, choice, at: String(value.at ?? ''), how: value.how ?? 'banner' };
  } catch {
    return null;
  }
}

/** The region check's answer: true for the EU, false elsewhere, null when it gave no verdict. */
export function parseRegion(body: unknown): boolean | null {
  const data = body as { ip?: { isEu?: unknown }; is_eu?: unknown } | null;
  const isEu = data?.ip?.isEu ?? data?.is_eu;
  return typeof isEu === 'boolean' ? isEu : null;
}

function store(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function loadConsent(): ConsentRecord | null {
  try {
    return parseRecord(store('localStorage')?.getItem(CONSENT_KEY) ?? null);
  } catch {
    return null;
  }
}

/** Stores the choice, tells gtag and every control on the page. */
export function saveConsent(choice: Choice, how: ConsentRecord['how']): ConsentRecord {
  const record: ConsentRecord = { v: CONSENT_VERSION, choice, at: new Date().toISOString(), how };
  try {
    store('localStorage')?.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked: the choice holds for this page only.
  }
  applyConsent(choice);
  for (const id of CATEGORY_IDS) if (!choice[id]) dropCookies(CATEGORIES[id].cookies);
  document.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }));
  return record;
}

export function applyConsent(choice: Choice): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', consentParams(choice));
  }
}

/** Expires every cookie matching `name` on this host and each parent domain (GA sets `.beda.lol`). */
export function dropCookies(name: RegExp): void {
  let names: string[];
  try {
    names = document.cookie.split(';').map((c) => c.split('=')[0]?.trim() ?? '');
  } catch {
    return;
  }
  const parts = location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`);
  for (const cookie of names.filter((n) => name.test(n))) {
    for (const domain of domains) {
      // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not in every browser the site supports.
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

/**
 * Whether this visitor is asked: true in the EU and whenever the check fails. Only a real
 * verdict is kept for the tab; a failure is retried on the next page.
 */
export async function needsBanner(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const tab = store('sessionStorage');
  try {
    const cached = tab?.getItem(REGION_KEY);
    if (cached === 'eu' || cached === 'other') return cached === 'eu';
  } catch {
    // no cache
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
  try {
    const res = await fetchImpl(GEO_ENDPOINT, { signal: controller.signal, cache: 'no-store' });
    const isEu = res.ok ? parseRegion(await res.json()) : null;
    if (isEu === null) return true;
    try {
      tab?.setItem(REGION_KEY, isEu ? 'eu' : 'other');
    } catch {
      // no cache
    }
    return isEu;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}
