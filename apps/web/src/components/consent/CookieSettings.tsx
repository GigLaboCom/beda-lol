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
  saveConsent,
} from '../../lib/consent';
import Categories from './Categories';
import '../../styles/consent.css';

/** The choice on `/cookies`: the only way back to it once the banner is gone. */
export default function CookieSettings({ lang }: { lang: Locale }) {
  const t = useTranslations(lang);
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [choice, setChoice] = useState<Choice>(denyAll());
  const [on, setOn] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setOn(analyticsOn());
    const sync = (r: ConsentRecord | null) => {
      setRecord(r);
      if (r) setChoice(r.choice);
    };
    sync(loadConsent());
    const follow = (e: Event) => sync((e as CustomEvent<ConsentRecord>).detail);
    document.addEventListener(CONSENT_EVENT, follow);
    return () => document.removeEventListener(CONSENT_EVENT, follow);
  }, []);

  function commit(next: Choice, action: string) {
    setChoice(next);
    const r = saveConsent(next, 'settings');
    setSaved(true);
    trackEvent('cookie_consent', { action, ...r.choice });
  }

  const status = saved
    ? t('consent.saved')
    : !record
      ? t('consent.none')
      : record.how === 'auto'
        ? t('consent.auto')
        : '';

  return (
    <section
      class="consent-settings"
      aria-labelledby="consent-settings-title"
      data-testid="consent-settings"
    >
      <h2 id="consent-settings-title">{t('consent.settings')}</h2>
      {!on && <p class="consent-note">{t('consent.off')}</p>}
      <Categories
        lang={lang}
        choice={choice}
        onChange={(next) => {
          setChoice(next);
          setSaved(false);
        }}
        idPrefix="consent-settings"
      />
      <div class="consent-actions">
        <button type="button" class="btn btn-brass" onClick={() => commit(choice, 'custom_save')}>
          {t('consent.save')}
        </button>
        <button type="button" class="btn" onClick={() => commit(grantAll(), 'accept_all')}>
          {t('consent.accept')}
        </button>
        <button type="button" class="btn" onClick={() => commit(denyAll(), 'reject_all')}>
          {t('consent.reject')}
        </button>
      </div>
      <p class="consent-status" role="status">
        {status}
      </p>
    </section>
  );
}
