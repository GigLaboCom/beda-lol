import { BRAND_BACKGROUND, manifestIcons } from '@beda/brand/icons';
import type { APIRoute } from 'astro';
import { defaultLocale, htmlLang, useTranslations } from '../i18n';

/**
 * Web app manifest, prerendered to `/manifest.webmanifest` and linked from
 * `Base.astro`. A manifest is one document per origin, so it is written in the
 * default locale. The icons come from `@beda/brand` (`task brand:icons`).
 */
export const GET: APIRoute = () => {
  const t = useTranslations(defaultLocale);
  const manifest = {
    id: '/',
    name: t('site.name'),
    short_name: t('site.name'),
    description: t('site.description'),
    lang: htmlLang[defaultLocale],
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BRAND_BACKGROUND,
    theme_color: BRAND_BACKGROUND,
    icons: manifestIcons,
  };
  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: { 'content-type': 'application/manifest+json; charset=utf-8' },
  });
};
