import { useState } from 'preact/hooks';
import { type Locale, useTranslations } from '../../i18n';
import { apiFetch } from '../../lib/auth/browser';
import type { AuthConfig } from '../../lib/auth/config';

/** Dev bench (`/dev/auth`): `/api/me` called from the browser with the session's token. */
export default function AuthBench({ cfg, lang = 'ru' }: { cfg: AuthConfig; lang?: Locale }) {
  const t = useTranslations(lang);
  const [me, setMe] = useState('');

  async function askMe() {
    try {
      const res = await apiFetch(cfg, '/api/me');
      setMe(`${res.status}\n${JSON.stringify(await res.json(), null, 2)}`);
    } catch (err) {
      setMe(String(err));
    }
  }

  return (
    <div class="auth-bench">
      <button class="btn" type="button" onClick={askMe}>
        {t('authdev.browserMe')}
      </button>
      {me && (
        <pre class="mono" data-testid="browser-me">
          {me}
        </pre>
      )}
    </div>
  );
}
