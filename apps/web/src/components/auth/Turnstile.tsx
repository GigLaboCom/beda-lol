import { useEffect, useRef } from 'preact/hooks';
import type { Locale } from '../../i18n';
import { TURNSTILE_ORIGIN } from '../../lib/auth/csp';

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}

let loading: Promise<TurnstileApi> | undefined;

/** Loads Cloudflare's script once per page, for explicit rendering. */
function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;
    script.onload = () => {
      const api = (window as { turnstile?: TurnstileApi }).turnstile;
      if (api) resolve(api);
      else reject(new Error('Turnstile did not load'));
    };
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Turnstile did not load'));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * Cloudflare Turnstile widget. Hands each fresh token to `onToken` (and `null` when it
 * expires or fails). A token is good for one request: bump `round` after using it.
 */
export default function Turnstile({
  siteKey,
  lang,
  round,
  onToken,
  onError,
}: {
  siteKey: string;
  lang: Locale;
  round: number;
  onToken: (token: string | null) => void;
  onError: (message: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);

  // Rendered once per key and language: the callbacks only set parent state.
  useEffect(() => {
    let gone = false;
    loadTurnstile().then(
      (api) => {
        if (gone || !box.current) return;
        const id = api.render(box.current, {
          sitekey: siteKey,
          language: lang,
          // The site is dark in both schemes (packages/tokens only shifts a few shades).
          theme: 'dark',
          size: 'flexible',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
        widget.current = { api, id };
      },
      (err: Error) => onError(err.message),
    );
    return () => {
      gone = true;
      widget.current?.api.remove(widget.current.id);
      widget.current = null;
    };
  }, [siteKey, lang]);

  useEffect(() => {
    if (round > 0) widget.current?.api.reset(widget.current.id);
  }, [round]);

  return <div class="turnstile" ref={box} />;
}
