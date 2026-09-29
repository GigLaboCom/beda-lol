import { useState } from 'preact/hooks';
import { fmt, type Locale, useTranslations } from '../../i18n';
import { browserClient } from '../../lib/auth/browser';
import type { AuthConfig } from '../../lib/auth/config';
import Turnstile from './Turnstile';

/**
 * The sign-in forms, used by `/voiti` and the `/dev/auth` bench: GitHub, or a mail with a
 * magic link and a one-time code (the send is behind Turnstile when it is on).
 *
 * The link and GitHub come back through `/auth/callback` to this same page, which then
 * sends a signed-in visitor on (or shows `?auth=failed`). The code signs in right here,
 * then goes to `next`.
 */
export default function SignIn({
  cfg,
  lang = 'ru',
  next,
}: {
  cfg: AuthConfig;
  lang?: Locale;
  /** A same-site path to open after a sign-in by code. */
  next: string;
}) {
  const t = useTranslations(lang);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const supabase = () => browserClient(cfg);
  const fail = (message: string) => setStatus(fmt(t('auth.error'), { message }));

  /** Back to this page, without a stale `auth=failed`. */
  function callback() {
    const here = new URL(location.href);
    here.searchParams.delete('auth');
    const back = `${here.pathname}${here.search}`;
    return `${location.origin}/auth/callback?next=${encodeURIComponent(back)}`;
  }

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
      options: {
        emailRedirectTo: callback(),
        captchaToken: captcha ?? undefined,
        // Kept in the user metadata of a new address; the mail template picks its language by it.
        data: { lang },
      },
    });
    // The Turnstile token is spent either way: ask the widget for a new one.
    if (cfg.turnstile) {
      setCaptcha(null);
      setRound((r) => r + 1);
    }
    if (error) fail(error.message);
    else setStatus(t('auth.sent'));
  }

  async function verify(e: Event) {
    e.preventDefault();
    const { error } = await supabase().auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (error) fail(error.message);
    else location.assign(next);
  }

  return (
    <div class="sign-in">
      <button class="btn btn-brass" type="button" onClick={github}>
        {t('auth.github')}
      </button>
      <p class="sign-in-or">{t('auth.or')}</p>
      <form onSubmit={send}>
        <label for="authEmail">{t('auth.email')}</label>
        <input
          id="authEmail"
          type="email"
          required
          autocomplete="email"
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
        />
        {cfg.turnstile && (
          <Turnstile
            siteKey={cfg.turnstile}
            lang={lang}
            round={round}
            onToken={setCaptcha}
            onError={fail}
          />
        )}
        <button class="btn btn-brass" type="submit" disabled={!!cfg.turnstile && !captcha}>
          {t('auth.send')}
        </button>
      </form>
      <form onSubmit={verify}>
        <label for="authCode">{t('auth.code')}</label>
        <input
          id="authCode"
          inputMode="numeric"
          autocomplete="one-time-code"
          required
          value={code}
          onInput={(e) => setCode((e.target as HTMLInputElement).value)}
        />
        <button class="btn" type="submit" disabled={!email}>
          {t('auth.verify')}
        </button>
      </form>
      <p class="status mono" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
