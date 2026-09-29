import { expect, type Page, test } from '@playwright/test';
import { type Key, type Locale, translate } from '../src/i18n';
import { analyticsScript } from '../src/lib/analytics';
import { CONSENT_KEY, GEO_ENDPOINT, REGION_KEY } from '../src/lib/consent';

// The cookie banner and /cookies. The page gets the real `/analytics.js` for a test id whatever
// the server has, gtag.js is a stub (nothing leaves for Google), and the region check answers
// what each test needs: the Caddy route to the shared service is not part of the dev stack.

const GA_ID = 'G-E2ETEST01';

async function stack(page: Page, geo: { status: number; body: unknown } | 'hang', ga = true) {
  // `astro dev` pins its toolbar to the bottom edge, over the banner's buttons.
  await page.addInitScript(() =>
    addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'astro-dev-toolbar { display: none !important; }';
      document.head.append(style);
    }),
  );
  await page.route('**/analytics.js', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: analyticsScript(ga ? GA_ID : null) }),
  );
  await page.route('https://www.googletagmanager.com/**', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: '' }),
  );
  await page.route(`**${GEO_ENDPOINT}`, (r) =>
    geo === 'hang'
      ? undefined
      : r.fulfill({
          status: geo.status,
          contentType: 'application/json',
          body: JSON.stringify(geo.body),
        }),
  );
}
const EU = { status: 200, body: { status: 'OK', ip: { isEu: true } } };
const ELSEWHERE = { status: 200, body: { status: 'OK', ip: { isEu: false } } };

/** gtag commands pushed so far, as arrays. */
const commands = (page: Page) =>
  page.evaluate(() => (window.dataLayer ?? []).map((c) => Array.from(c as ArrayLike<unknown>)));
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), CONSENT_KEY);
const lastUpdate = async (page: Page) =>
  (await commands(page)).filter((c) => c[0] === 'consent' && c[1] === 'update').at(-1)?.[2] as
    | Record<string, string>
    | undefined;

for (const lang of ['ru', 'en'] as Locale[]) {
  const t = (key: Key) => translate(lang, key);
  const prefix = lang === 'ru' ? '' : '/en';
  const home = prefix || '/';

  test(`${lang}: an EU visitor is asked, and a refusal sticks`, async ({ page }) => {
    await stack(page, EU);
    await page.goto(home);
    const banner = page.getByRole('region', { name: t('consent.title') });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('link', { name: t('consent.policy') })).toHaveAttribute(
      'href',
      `${prefix}/cookies`,
    );
    // Consent Mode starts denied, and the page view goes out with the locale.
    const first = await commands(page);
    expect(first[0]).toEqual([
      'consent',
      'default',
      expect.objectContaining({ analytics_storage: 'denied' }),
    ]);
    expect(first).toContainEqual(['event', 'page_view', expect.objectContaining({ locale: lang })]);

    // The banner fits a phone.
    const box = await banner.boundingBox();
    const view = page.viewportSize();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(view?.width ?? 0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(view?.height ?? 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

    await banner.getByRole('button', { name: t('consent.reject') }).click();
    await expect(banner).toBeHidden();
    expect((await stored(page)).choice).toEqual({ analytics: false });
    expect(await lastUpdate(page)).toMatchObject({ analytics_storage: 'denied' });

    await page.reload();
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);
    expect(await lastUpdate(page)).toMatchObject({ analytics_storage: 'denied' });
  });

  test(`${lang}: choosing in the banner`, async ({ page }) => {
    await stack(page, EU);
    await page.goto(home);
    const banner = page.getByRole('region', { name: t('consent.title') });
    await banner.getByRole('button', { name: t('consent.customize') }).click();
    await banner.getByRole('checkbox', { name: t('consent.cat.analytics') }).check();
    await banner.getByRole('button', { name: t('consent.save') }).click();
    await expect(banner).toBeHidden();
    expect(await stored(page)).toMatchObject({ choice: { analytics: true }, how: 'banner' });
    expect(await lastUpdate(page)).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'denied',
    });
  });
}

test('outside the EU the choice is granted without asking', async ({ page }) => {
  await stack(page, ELSEWHERE);
  await page.goto('/');
  await expect.poll(() => stored(page)).toMatchObject({ choice: { analytics: true }, how: 'auto' });
  await expect(page.getByTestId('consent-banner')).toHaveCount(0);
  expect(await lastUpdate(page)).toMatchObject({ analytics_storage: 'granted' });
  expect(await page.evaluate((k) => sessionStorage.getItem(k), REGION_KEY)).toBe('other');
});

test('a region check that fails shows the banner and is tried again', async ({ page }) => {
  await stack(page, { status: 404, body: 'Not found' });
  await page.goto('/');
  await expect(page.getByTestId('consent-banner')).toBeVisible();
  expect(await page.evaluate((k) => sessionStorage.getItem(k), REGION_KEY)).toBeNull();
  expect(await stored(page)).toBeNull();
});

test('a region check that never answers shows the banner', async ({ page }) => {
  await stack(page, 'hang');
  await page.goto('/');
  await expect(page.getByTestId('consent-banner')).toBeVisible({ timeout: 8000 });
});

test('/cookies changes the choice and a refusal drops the GA cookies', async ({
  page,
  context,
  baseURL,
}) => {
  const t = (key: Key) => translate('ru', key);
  await stack(page, ELSEWHERE);
  await context.addCookies([
    { name: '_ga', value: 'GA1.1.1.1', url: baseURL ?? 'http://localhost:4321' },
    { name: '_ga_E2ETEST01', value: 'GS1.1.1', url: baseURL ?? 'http://localhost:4321' },
  ]);
  await page.goto('/cookies');
  const settings = page.getByRole('region', { name: t('consent.settings') });
  const box = settings.getByRole('checkbox', { name: t('consent.cat.analytics') });
  // Granted automatically on this first visit; the settings follow.
  await expect(box).toBeChecked();
  await expect(settings.getByRole('status')).toHaveText(t('consent.auto'));

  await settings.getByRole('button', { name: t('consent.reject') }).click();
  await expect(box).not.toBeChecked();
  await expect(settings.getByRole('status')).toHaveText(t('consent.saved'));
  expect(await stored(page)).toMatchObject({ choice: { analytics: false }, how: 'settings' });
  expect((await context.cookies()).filter((c) => c.name.startsWith('_ga'))).toEqual([]);

  await box.check();
  await settings.getByRole('button', { name: t('consent.save') }).click();
  expect((await stored(page)).choice).toEqual({ analytics: true });
  expect(await lastUpdate(page)).toMatchObject({ analytics_storage: 'granted' });
});

test('saving on /cookies closes an open banner', async ({ page }) => {
  const t = (key: Key) => translate('ru', key);
  await stack(page, EU);
  await page.goto('/cookies');
  await expect(page.getByTestId('consent-banner')).toBeVisible();
  await page
    .getByRole('region', { name: t('consent.settings') })
    .getByRole('button', { name: t('consent.accept') })
    .click();
  await expect(page.getByTestId('consent-banner')).toHaveCount(0);
});

test('with analytics off there is no banner, and /cookies says so', async ({ page }) => {
  const t = (key: Key) => translate('ru', key);
  await stack(page, EU, false);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('consent-banner')).toHaveCount(0);
  await page.goto('/cookies');
  await expect(page.getByTestId('consent-settings').getByText(t('consent.off'))).toBeVisible();
});
