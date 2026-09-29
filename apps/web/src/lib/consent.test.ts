import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CATEGORY_IDS,
  CONSENT_KEY,
  consentParams,
  DEFAULT_CONSENT,
  denyAll,
  GEO_ENDPOINT,
  grantAll,
  needsBanner,
  parseRecord,
  parseRegion,
  REGION_KEY,
} from './consent';
import { REVEAL_KEY, SESSION_KEY } from './quiz-storage';

describe('consentParams', () => {
  it('denies everything but security before a choice', () => {
    expect(DEFAULT_CONSENT.security_storage).toBe('granted');
    const rest = Object.entries(DEFAULT_CONSENT).filter(([k]) => k !== 'security_storage');
    expect(rest.every(([, v]) => v === 'denied')).toBe(true);
  });

  it('opens only analytics storage on consent: the site has no ads', () => {
    const p = consentParams(grantAll());
    expect(p.analytics_storage).toBe('granted');
    expect([p.ad_storage, p.ad_user_data, p.ad_personalization]).toEqual([
      'denied',
      'denied',
      'denied',
    ]);
    expect(consentParams(denyAll())).toEqual(DEFAULT_CONSENT);
  });
});

describe('parseRecord', () => {
  const ok = JSON.stringify({
    v: 1,
    choice: { analytics: true },
    at: '2026-09-29T00:00:00Z',
    how: 'banner',
  });

  it('reads a stored choice', () => {
    expect(parseRecord(ok)?.choice).toEqual({ analytics: true });
  });

  it('asks again for anything else', () => {
    for (const raw of [
      null,
      '',
      '{',
      '[]',
      '{"v":2,"choice":{"analytics":true}}',
      '{"v":1,"choice":{}}',
      '{"v":1,"choice":{"analytics":"yes"}}',
    ]) {
      expect(parseRecord(raw)).toBeNull();
    }
  });
});

describe('parseRegion', () => {
  it('takes the shared service answer, and the flat shape', () => {
    expect(parseRegion({ status: 'OK', ip: { isEu: true } })).toBe(true);
    expect(parseRegion({ status: 'OK', ip: { isEu: false } })).toBe(false);
    expect(parseRegion({ is_eu: false })).toBe(false);
  });

  it('gives no verdict for FAIL or a strange body', () => {
    for (const body of [{ status: 'FAIL' }, null, 'eu', { ip: { isEu: 'true' } }]) {
      expect(parseRegion(body)).toBeNull();
    }
  });
});

describe('needsBanner', () => {
  const tab = new Map<string, string>();
  afterEach(() => {
    tab.clear();
    vi.unstubAllGlobals();
  });
  function stubTab() {
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (k: string) => tab.get(k) ?? null,
        setItem: (k: string, v: string) => void tab.set(k, v),
      },
    });
  }
  const answer = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('asks in the EU and keeps the verdict for the tab', async () => {
    stubTab();
    const f = answer(200, { status: 'OK', ip: { isEu: true } });
    expect(await needsBanner(f)).toBe(true);
    expect(tab.get(REGION_KEY)).toBe('eu');
    expect(await needsBanner(f)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledWith(GEO_ENDPOINT, expect.anything());
  });

  it('does not ask elsewhere', async () => {
    stubTab();
    expect(await needsBanner(answer(200, { status: 'OK', ip: { isEu: false } }))).toBe(false);
    expect(tab.get(REGION_KEY)).toBe('other');
  });

  it('asks when the check fails, and tries again on the next page', async () => {
    stubTab();
    expect(await needsBanner(answer(200, { status: 'FAIL' }))).toBe(true);
    expect(await needsBanner(answer(404, 'Not found'))).toBe(true);
    const down = vi.fn(async () => {
      throw new TypeError('network');
    }) as unknown as typeof fetch;
    expect(await needsBanner(down)).toBe(true);
    expect(tab.has(REGION_KEY)).toBe(false);
  });

  it('works without storage at all', async () => {
    expect(await needsBanner(answer(200, { ip: { isEu: false } }))).toBe(false);
  });
});

describe('the cookie page', () => {
  const page = (lang: string) =>
    readFileSync(new URL(`../content/legal/${lang}/cookies.md`, import.meta.url), 'utf8');

  it('lists everything the site stores, in both languages', () => {
    const keys = [
      CONSENT_KEY,
      REGION_KEY,
      SESSION_KEY,
      REVEAL_KEY,
      'yacht-beda-v1',
      'sb-…-auth-token',
      '_ga',
    ];
    for (const lang of ['ru', 'en']) {
      for (const key of keys) expect(page(lang), `${lang}: ${key}`).toContain(`\`${key}\``);
    }
  });

  it('has copy for every category', () => {
    const ui = readFileSync(new URL('../i18n/ui.ts', import.meta.url), 'utf8');
    for (const id of CATEGORY_IDS) {
      expect(ui.match(new RegExp(`'consent\\.cat\\.${id}':`, 'g'))).toHaveLength(2);
      expect(ui.match(new RegExp(`'consent\\.cat\\.${id}\\.desc':`, 'g'))).toHaveLength(2);
    }
  });
});
