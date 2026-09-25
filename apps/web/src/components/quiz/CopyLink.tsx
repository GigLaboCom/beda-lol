import { useState } from 'preact/hooks';
import { t } from '../../i18n/ru';

/** «Скопировать ссылку» with a visible status line. */
export default function CopyLink({ url }: { url: string }) {
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
