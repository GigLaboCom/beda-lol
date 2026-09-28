import { useState } from 'preact/hooks';
import { type Locale, useTranslations } from '../../i18n';

/** «Скопировать ссылку» with a visible status line. */
export default function CopyLink({ url, lang }: { url: string; lang: Locale }) {
  const t = useTranslations(lang);
  const [status, setStatus] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(t('result.copied'));
    } catch {
      setStatus(t('result.copyFailed'));
    }
  }

  return (
    <>
      <button class="btn" type="button" onClick={copy}>
        {t('result.copy')}
      </button>
      <p class="status" role="status">
        {status}
      </p>
    </>
  );
}
