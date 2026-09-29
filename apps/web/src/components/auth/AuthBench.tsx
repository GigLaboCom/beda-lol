import { useState } from 'preact/hooks';
import { fmt, type Locale, useTranslations } from '../../i18n';
import { apiFetch, browserClient } from '../../lib/auth/browser';
import type { AuthConfig } from '../../lib/auth/config';

/** Dev sign-in bench (`/dev/auth`): GitHub, magic link or OTP code, `/api/me` from the browser, sign-out. */
export default function AuthBench({
  cfg,
  lang = 'ru',
  signedIn,
}: {
  cfg: AuthConfig;
  lang?: Locale;
  signedIn: boolean;
}) {
  const t = useTranslations(lang);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [me, setMe] = useState('');
  const supabase = () => browserClient(cfg);
  const fail = (message: string) => setStatus(fmt(t('authdev.error'), { message }));
  const callback = () =>
    `${location.origin}/auth/callback?next=${encodeURIComponent(location.pathname)}`;

  async function github() {
    // Leaves for GitHub; comes back to /auth/callback with a PKCE code.
    const { error } = await supabase().auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: callback() },
    });
    if (error) fail(error.message);
  }

  async function send(e: Event) {
    e.preventDefault();
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback() },
    });
    if (error) fail(error.message);
    else setStatus(t('authdev.sent'));
  }

  async function verify(e: Event) {
    e.preventDefault();
    const { error } = await supabase().auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (error) fail(error.message);
    else location.reload();
  }

  async function askMe() {
    try {
      const res = await apiFetch(cfg, '/api/me');
      setMe(`${res.status}\n${JSON.stringify(await res.json(), null, 2)}`);
    } catch (err) {
      fail(String(err));
    }
  }

  async function signOut() {
    await supabase().auth.signOut();
    location.reload();
  }

  return (
    <div class="auth-bench">
      {!signedIn && (
        <>
          <button class="btn btn-brass" type="button" onClick={github}>
            {t('authdev.github')}
          </button>
          <form onSubmit={send}>
            <label for="authEmail">{t('authdev.email')}</label>
            <input
              id="authEmail"
              type="email"
              required
              autocomplete="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            />
            <button class="btn btn-brass" type="submit">
              {t('authdev.send')}
            </button>
          </form>
          <form onSubmit={verify}>
            <label for="authCode">{t('authdev.code')}</label>
            <input
              id="authCode"
              inputMode="numeric"
              autocomplete="one-time-code"
              required
              value={code}
              onInput={(e) => setCode((e.target as HTMLInputElement).value)}
            />
            <button class="btn" type="submit" disabled={!email}>
              {t('authdev.verify')}
            </button>
          </form>
        </>
      )}
      <div class="auth-actions">
        <button class="btn" type="button" onClick={askMe}>
          {t('authdev.browserMe')}
        </button>
        {signedIn && (
          <button class="btn" type="button" onClick={signOut}>
            {t('authdev.signOut')}
          </button>
        )}
      </div>
      <p class="status mono" role="status" aria-live="polite">
        {status}
      </p>
      {me && (
        <pre class="mono" data-testid="browser-me">
          {me}
        </pre>
      )}
    </div>
  );
}
