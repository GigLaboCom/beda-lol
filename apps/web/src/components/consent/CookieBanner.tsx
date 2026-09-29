import { useEffect, useState } from 'preact/hooks';
import { type Locale, useTranslations } from '../../i18n';
import { analyticsOn, trackEvent } from '../../lib/analytics';
import {
  type Choice,
  CONSENT_EVENT,
  type ConsentRecord,
  denyAll,
  grantAll,
  loadConsent,
  needsBanner,
  saveConsent,
} from '../../lib/consent';
import Categories from './Categories';
import '../../styles/consent.css';

/**
 * The consent banner, on every page (`Base.astro`). It shows only when analytics is on, no
 * choice is stored and the region check asks for it (`lib/consent.ts`); outside the EU the
 * choice is granted without asking. `/cookies` changes it later.
 */
export default function CookieBanner({ lang, policyHref }: { lang: Locale; policyHref: string }) {
  const t = useTranslations(lang);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [choice, setChoice] = useState<Choice>(denyAll());

  useEffect(() => {
    const close = () => setOpen(false);
    document.addEventListener(CONSENT_EVENT, close);
    if (analyticsOn() && !loadConsent()) {
      void needsBanner().then((ask) => {
        if (loadConsent()) return;
        if (ask) {
          setOpen(true);
        } else {
          saveConsent(grantAll(), 'auto');
          trackEvent('cookie_consent', { action: 'auto_grant' });
        }
      });
    }
    return () => document.removeEventListener(CONSENT_EVENT, close);
  }, []);

  if (!open) return null;

  function commit(next: Choice, action: string) {
    const record: ConsentRecord = saveConsent(next, 'banner');
    trackEvent('cookie_consent', { action, ...record.choice });
  }

  return (
    <section class="consent-banner" aria-label={t('consent.title')} data-testid="consent-banner">
      <h2>{t('consent.title')}</h2>
      <p>{t('consent.text')}</p>
      {custom && (
        <Categories lang={lang} choice={choice} onChange={setChoice} idPrefix="consent-banner" />
      )}
      <div class="consent-actions">
        <button
          type="button"
          class="btn btn-brass"
          onClick={() => commit(grantAll(), 'accept_all')}
        >
          {t('consent.accept')}
        </button>
        <button type="button" class="btn" onClick={() => commit(denyAll(), 'reject_all')}>
          {t('consent.reject')}
        </button>
        {custom ? (
          <button type="button" class="btn" onClick={() => commit(choice, 'custom_save')}>
            {t('consent.save')}
          </button>
        ) : (
          <button type="button" class="btn" onClick={() => setCustom(true)}>
            {t('consent.customize')}
          </button>
        )}
        <a class="consent-more" href={policyHref}>
          {t('consent.policy')}
        </a>
      </div>
    </section>
  );
}
