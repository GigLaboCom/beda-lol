import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { fmt, type Key, type Locale, translate } from '../src/i18n';
import { TURNSTILE_ORIGIN } from '../src/lib/auth/csp';
import { OAUTH_PROVIDERS, type OAuthProvider, PROVIDER_NAMES } from '../src/lib/auth/providers';

// Sign-in, the cabinet and the /dev/auth bench against the local stack: the mail comes
// through Mailpit, the e-mail form passes Turnstile (Cloudflare's test keys locally), the
// server and the browser both reach the Rust API as the same user. Account deletion needs
// the API started with BEDA_SUPABASE_SECRET_KEY.

const MAIL = process.env.BEDA_E2E_MAIL_URL ?? 'http://127.0.0.1:54324';
const t = (key: Key) => translate('ru', key);

interface SignInMail {
  subject: string;
  link: string;
  code: string;
}

/** The newest mail to `to` in Mailpit, with the link and the code from our template. */
async function signInMail(to: string): Promise<SignInMail> {
  const search = `${MAIL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`;
  for (let i = 0; i < 40; i++) {
    const id = (await (await fetch(search)).json()).messages?.[0]?.ID;
    if (id) {
      const msg = await (await fetch(`${MAIL}/api/v1/message/${id}`)).json();
      const html: string = msg.HTML;
      const link = html.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
      const code = html.match(/<strong[^>]*>(\d{6})<\/strong>/)?.[1];
      if (!link || !code) throw new Error(`mail without a link or a code:\n${html}`);
      return { subject: msg.Subject, link, code };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no mail for ${to}`);
}

/**
 * Page errors and console errors, checked at the end of each test. Console noise from the
 * Turnstile frame is not ours (WebKit logs a postMessage race when the page navigates away).
 */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (`${m.location().url} ${m.text()}`.includes(TURNSTILE_ORIGIN)) return;
    errors.push(m.text());
  });
  return errors;
}

async function waitForIslands(page: Page) {
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

async function askForMail(page: Page, email: string, lang: Locale = 'ru'): Promise<SignInMail> {
  const tr = (key: Key) => translate(lang, key);
  await waitForIslands(page);
  await page.getByLabel(tr('auth.email'), { exact: true }).fill(email);
  const send = page.getByRole('button', { name: tr('auth.send') });
  // Enabled once Turnstile has handed over a token.
  await expect(send).toBeEnabled({ timeout: 20_000 });
  await send.click();
  await expect(page.getByText(tr('auth.sent'))).toBeVisible();
  const mail = await signInMail(email);
  expect(mail.subject).toBe(lang === 'en' ? 'Sign in to beda.lol' : 'Вход на beda.lol');
  return mail;
}

/** Signs in on /voiti with the code from the mail; lands on the cabinet. */
async function signInByCode(page: Page, email: string) {
  await page.goto('/voiti');
  const mail = await askForMail(page, email);
  await page.getByLabel(t('auth.code')).fill(mail.code);
  await page.getByRole('button', { name: t('auth.verify') }).click();
  await page.waitForURL(/\/kabinet$/);
  await expect(page.getByTestId('cabinet-email')).toHaveText(email);
}

/** The header link, once the server island has replaced its fallback. */
async function expectHeader(page: Page, label: string) {
  await expect(page.getByTestId('head-account')).toHaveText(label);
}

/** The refresh token of the context's Supabase session, from its (possibly chunked) cookie. */
async function refreshToken(context: BrowserContext): Promise<string> {
  const parts = (await context.cookies())
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  const raw = parts.map((c) => c.value).join('');
  const json = raw.startsWith('base64-') ? Buffer.from(raw.slice(7), 'base64url').toString() : raw;
  return JSON.parse(json).refresh_token;
}

/** Supabase's URL and publishable key, as the page hands them to its islands. */
async function authSettings(page: Page): Promise<{ url: string; key: string }> {
  const props = await page.locator('astro-island[props*="cfg"]').first().getAttribute('props');
  const cfg = JSON.parse(props ?? '{}').cfg[1];
  return { url: cfg.url[1], key: cfg.key[1] };
}

const address = (kind: string, browser: string) =>
  `e2e-${kind}-${browser}-${Date.now()}@example.test`;

test('the link from the mail signs in from the header and comes back; sign-out signs out', async ({
  page,
  browserName,
}) => {
  const errors = watchErrors(page);
  const email = address('link', browserName);
  await page.goto('/osmotr');
  await expectHeader(page, t('head.signIn'));
  await page.getByTestId('head-account').click();
  await page.waitForURL(/\/voiti\?next=%2Fosmotr$/);
  const mail = await askForMail(page, email);
  await page.goto(mail.link);
  await page.waitForURL(/\/osmotr$/);
  await expectHeader(page, t('head.cabinet'));
  await page.getByTestId('head-account').click();
  await page.waitForURL(/\/kabinet$/);
  await expect(page.getByTestId('cabinet-email')).toHaveText(email);
  await page.getByRole('button', { name: t('auth.signOut'), exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expectHeader(page, t('head.signIn'));
  await page.goto('/kabinet');
  await page.waitForURL(/\/voiti\?next=%2Fkabinet$/);
  expect(errors).toEqual([]);
});

test('the code signs in on the bench; the server and the browser see the same user', async ({
  page,
  browserName,
}) => {
  const errors = watchErrors(page);
  const email = address('code', browserName);
  await page.goto('/dev/auth');
  await expect(page.getByTestId('server-auth')).toHaveText(t('authdev.signedOut'));
  const mail = await askForMail(page, email);
  await page.getByLabel(t('auth.code')).fill(mail.code);
  await page.getByRole('button', { name: t('auth.verify') }).click();
  await expect(page.getByTestId('server-auth')).toHaveText(
    fmt(t('authdev.signedIn'), { who: email }),
  );
  const serverMe = JSON.parse((await page.getByTestId('server-me').textContent()) ?? '');
  expect(serverMe.role).toBe('user');
  expect(serverMe.account).toMatchObject({ kind: 'personal', role: 'owner' });
  await waitForIslands(page);
  await page.getByRole('button', { name: t('authdev.browserMe') }).click();
  const browserMe = (await page.getByTestId('browser-me').textContent()) ?? '';
  expect(browserMe.split('\n')[0]).toBe('200');
  expect(browserMe).toContain(serverMe.id);
  await page.getByRole('button', { name: t('auth.signOut') }).click();
  await expect(page.getByTestId('server-auth')).toHaveText(t('authdev.signedOut'));
  expect(errors).toEqual([]);
});

/** Where Supabase sends each provider's button (`[auth.external.*]` in supabase/config.toml). */
const AUTHORIZE: Record<OAuthProvider, string> = {
  github: 'https://github.com/login/oauth/authorize',
  google: 'https://accounts.google.com/o/oauth2/v2/auth',
  x: 'https://x.com/i/oauth2/authorize',
};

test('the sign-in page offers every provider the stack has', async ({ page }) => {
  await page.goto('/voiti');
  // Unset BEDA_AUTH_PROVIDERS in dev: all of them, in the site's order.
  await expect(page.locator('.lead')).toContainText('через GitHub, Google или X — или по почте');
  const buttons = page.locator('.sign-in-oauth button');
  await expect(buttons).toHaveText(
    OAUTH_PROVIDERS.map((p) => fmt(t('auth.oauth'), { name: PROVIDER_NAMES[p] })),
  );
});

for (const provider of OAUTH_PROVIDERS) {
  const name = PROVIDER_NAMES[provider];
  test(`${name} goes through Supabase, and a denied sign-in comes back as failed`, async ({
    page,
  }) => {
    const errors = watchErrors(page);
    let sent: URL | undefined;
    // Navigation redirects are not routed: catch Supabase's /authorize and read where it sends.
    await page.route('**/auth/v1/authorize?**', async (route) => {
      const res = await route.fetch({ maxRedirects: 0 });
      sent = new URL(res.headers().location ?? '');
      await route.fulfill({ contentType: 'text/html', body: `<p>${provider}</p>` });
    });
    await page.goto('/voiti');
    await waitForIslands(page);
    await page.getByRole('button', { name: fmt(t('auth.oauth'), { name }) }).click();
    await page.getByText(provider, { exact: true }).waitFor();
    expect(`${sent?.origin}${sent?.pathname}`).toBe(AUTHORIZE[provider]);
    const callback = new URL(sent?.searchParams.get('redirect_uri') ?? '');
    expect(callback.pathname).toBe('/auth/v1/callback');
    await page.unroute('**/auth/v1/authorize?**');

    // What the provider sends back when the person presses Cancel.
    callback.search = new URLSearchParams({
      error: 'access_denied',
      state: sent?.searchParams.get('state') ?? '',
    }).toString();
    await page.goto(callback.href);
    // Supabase adds the error to the fragment as well.
    await page.waitForURL(/\/voiti\?auth=failed(#|$)/);
    await expect(page.getByRole('alert')).toHaveText(t('auth.failed'));
    await expectHeader(page, t('head.signIn'));
    expect(errors).toEqual([]);
  });
}

test('sign-out on all devices revokes the other sessions', async ({ browser, browserName }) => {
  const email = address('all', browserName);
  const here = await browser.newContext();
  const there = await browser.newContext();
  const page = await here.newPage();
  const other = await there.newPage();
  const errors = watchErrors(page);
  await signInByCode(page, email);
  await signInByCode(other, email);
  await other.goto('/dev/auth');
  const { url, key } = await authSettings(other);
  const token = await refreshToken(there);

  await page.getByRole('button', { name: t('auth.signOutAll') }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await expectHeader(page, t('head.signIn'));

  // The other device's session can no longer be refreshed: it ends at its next refresh.
  const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: key, 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: token }),
  });
  expect(res.status).toBe(400);
  expect(errors).toEqual([]);
  await here.close();
  await there.close();
});

test('the account can be deleted from the cabinet', async ({ page, browserName }) => {
  const errors = watchErrors(page);
  const email = address('delete', browserName);
  await signInByCode(page, email);
  const remove = page.getByRole('button', { name: t('cabinet.deleteButton') });
  // Not without the confirmation: the checkbox is required.
  await remove.click();
  await expect(page).toHaveURL(/\/kabinet$/);
  await page.getByLabel(t('cabinet.deleteConfirm')).check();
  await remove.click();
  await page.waitForURL(/\/voiti\?account=deleted$/);
  await expect(page.getByText(t('signin.deleted'))).toBeVisible();
  await expectHeader(page, t('head.signIn'));
  await page.goto('/kabinet');
  await page.waitForURL(/\/voiti\?next=%2Fkabinet$/);
  expect(errors).toEqual([]);
});

test('English sign-in gets the English mail and the English cabinet', async ({
  page,
  browserName,
}) => {
  const errors = watchErrors(page);
  const en = (key: Key) => translate('en', key);
  const email = address('en', browserName);
  await page.goto('/en/voiti');
  const mail = await askForMail(page, email, 'en');
  await page.getByLabel(en('auth.code')).fill(mail.code);
  await page.getByRole('button', { name: en('auth.verify') }).click();
  await page.waitForURL(/\/en\/kabinet$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en('cabinet.title'));
  await expectHeader(page, en('head.cabinet'));
  expect(errors).toEqual([]);
});
