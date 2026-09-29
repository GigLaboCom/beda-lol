import { expect, type Page, test } from '@playwright/test';
import { fmt, type Key, translate } from '../src/i18n';
import { TURNSTILE_ORIGIN } from '../src/lib/auth/csp';

// Sign-in on /dev/auth against the local stack: the mail comes through Mailpit, the e-mail
// form passes Turnstile (Cloudflare's test keys locally), the server and the browser both
// reach the Rust API as the same user.

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

async function openBench(page: Page) {
  await page.goto('/dev/auth');
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

async function askForMail(page: Page, email: string): Promise<SignInMail> {
  await page.getByLabel(t('authdev.email')).fill(email);
  const send = page.getByRole('button', { name: t('authdev.send') });
  // Enabled once Turnstile has handed over a token.
  await expect(send).toBeEnabled({ timeout: 20_000 });
  await send.click();
  await expect(page.getByText(t('authdev.sent'))).toBeVisible();
  const mail = await signInMail(email);
  expect(mail.subject).toBe('Вход на beda.lol');
  return mail;
}

async function expectSignedIn(page: Page, email: string) {
  await expect(page.getByTestId('server-auth')).toHaveText(
    fmt(t('authdev.signedIn'), { who: email }),
  );
  const serverMe = JSON.parse((await page.getByTestId('server-me').textContent()) ?? '');
  expect(serverMe.role).toBe('user');
  expect(serverMe.account).toMatchObject({ kind: 'personal', role: 'owner' });
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
  await page.getByRole('button', { name: t('authdev.browserMe') }).click();
  const browserMe = (await page.getByTestId('browser-me').textContent()) ?? '';
  expect(browserMe.split('\n')[0]).toBe('200');
  expect(browserMe).toContain(serverMe.id);
}

const address = (kind: string, browser: string) =>
  `e2e-${kind}-${browser}-${Date.now()}@example.test`;

test('the link from the mail signs in, and sign-out signs out', async ({ page, browserName }) => {
  const errors = watchErrors(page);
  const email = address('link', browserName);
  await openBench(page);
  await expect(page.getByTestId('server-auth')).toHaveText(t('authdev.signedOut'));
  const mail = await askForMail(page, email);
  await page.goto(mail.link);
  await page.waitForURL(/\/dev\/auth/);
  await expectSignedIn(page, email);
  await page.getByRole('button', { name: t('authdev.signOut') }).click();
  await expect(page.getByTestId('server-auth')).toHaveText(t('authdev.signedOut'));
  expect(errors).toEqual([]);
});

test('the code from the mail signs in', async ({ page, browserName }) => {
  const errors = watchErrors(page);
  const email = address('code', browserName);
  await openBench(page);
  const mail = await askForMail(page, email);
  await page.getByLabel(t('authdev.code')).fill(mail.code);
  await page.getByRole('button', { name: t('authdev.verify') }).click();
  await expectSignedIn(page, email);
  expect(errors).toEqual([]);
});

test('GitHub goes through Supabase, and a denied sign-in comes back as failed', async ({
  page,
}) => {
  const errors = watchErrors(page);
  let github: URL | undefined;
  // Navigation redirects are not routed: catch Supabase's /authorize and read where it sends.
  await page.route('**/auth/v1/authorize?**', async (route) => {
    const res = await route.fetch({ maxRedirects: 0 });
    github = new URL(res.headers().location ?? '');
    await route.fulfill({ contentType: 'text/html', body: '<p>github</p>' });
  });
  await openBench(page);
  await page.getByRole('button', { name: t('authdev.github') }).click();
  await page.getByText('github', { exact: true }).waitFor();
  expect(`${github?.origin}${github?.pathname}`).toBe('https://github.com/login/oauth/authorize');
  const callback = new URL(github?.searchParams.get('redirect_uri') ?? '');
  expect(callback.pathname).toBe('/auth/v1/callback');
  await page.unroute('**/auth/v1/authorize?**');

  // What GitHub sends back when the person presses Cancel.
  callback.search = new URLSearchParams({
    error: 'access_denied',
    state: github?.searchParams.get('state') ?? '',
  }).toString();
  await page.goto(callback.href);
  await page.waitForURL(/\/dev\/auth\?auth=failed/);
  await expect(page.getByRole('alert')).toHaveText(t('authdev.failed'));
  await expect(page.getByTestId('server-auth')).toHaveText(t('authdev.signedOut'));
  expect(errors).toEqual([]);
});
