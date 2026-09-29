import { expect, test } from '@playwright/test';
import { type Key, type Locale, translate } from '../src/i18n';

// The rules, the privacy and the cookie policy: reachable from the footer (the first two also
// from sign-in), marked as drafts while they are, and readable at phone width (the long Russian
// heading included).

for (const lang of ['ru', 'en'] as Locale[]) {
  const t = (key: Key) => translate(lang, key);
  const prefix = lang === 'ru' ? '' : '/en';

  test(`${lang}: the footer leads to each page, which fits a phone`, async ({ page }) => {
    for (const [label, path] of [
      [t('foot.rules'), '/pravila'],
      [t('foot.privacy'), '/konfidencialnost'],
      [t('foot.cookies'), '/cookies'],
    ] as const) {
      await page.goto(prefix || '/');
      await page
        .getByRole('navigation', { name: t('foot.legalLabel') })
        .getByRole('link', { name: label })
        .click();
      await page.waitForURL(`**${prefix}${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('note')).toHaveText(t('legal.draft'));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, follow',
      );
      const box = await page.getByRole('heading', { level: 1 }).boundingBox();
      const width = page.viewportSize()?.width ?? 0;
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
  });

  test(`${lang}: sign-in links the rules and the policy`, async ({ page }) => {
    await page.goto(`${prefix}/voiti`);
    const note = page.getByTestId('signin-legal');
    await expect(note.getByRole('link', { name: t('signin.rules') })).toHaveAttribute(
      'href',
      `${prefix}/pravila`,
    );
    await expect(note.getByRole('link', { name: t('signin.privacy') })).toHaveAttribute(
      'href',
      `${prefix}/konfidencialnost`,
    );
  });
}
