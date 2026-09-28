import { findRemoval, MAX_NAME_LENGTH, normalizeName, type Verdict, verdict } from '@beda/core';
import { EN_LABEL_TEXT, fitSize, loadExt, needsExt, renderTransom } from '@beda/transom';
import { attachTransom } from '@beda/transom/client';
import { TIMELINE } from '@beda/transom/timeline';
import { useEffect, useRef, useState } from 'preact/hooks';
import { type Locale, useTranslations } from '../../i18n';
import { recordNamerPlayed } from '../../lib/api';

function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function NamerIsland({ lang = 'ru' }: { lang?: Locale }) {
  const t = useTranslations(lang);
  const labelText = lang === 'en' ? EN_LABEL_TEXT : undefined;
  const [input, setInput] = useState('');
  const [result, setResult] = useState<Verdict | null>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const letters = useRef<string[]>([]);
  const timer = useRef<number | undefined>(undefined);

  function fit() {
    const out = outRef.current?.parentElement;
    const wrap = boardRef.current?.firstElementChild as HTMLElement | null | undefined;
    if (!out || !wrap || !letters.current.length) return;
    const avail = Math.min(out.clientWidth, 640) * 0.95;
    wrap.style.setProperty('--ts', `${fitSize(letters.current, avail)}px`);
  }

  async function launch(raw: string, record: boolean) {
    const typed = raw.replace(/\s+/g, ' ').trim();
    const name = normalizeName(typed);
    const board = boardRef.current;
    if (!name || !board) return;
    const chars = Array.from(name);
    const removal = findRemoval(name);
    // Accented Latin, other Cyrillic letters and rare symbols load on demand.
    if (needsExt(name)) await loadExt();
    letters.current = chars;

    // The board is plain DOM owned by the transom controller, not by Preact.
    board.innerHTML = renderTransom({ letters: chars, labelText, idPrefix: 'namer-' });
    fit();
    const root = board.firstElementChild as HTMLElement;
    const tr = attachTransom(root);
    const fallen = chars.map((_, i) => (removal.removed.includes(i) ? 0 : 4));
    window.clearTimeout(timer.current);
    if (reducedMotion()) tr.set(fallen, { animate: false });
    else timer.current = window.setTimeout(() => tr.set(fallen), TIMELINE.namerStart);

    setResult(verdict(typed, removal, lang));
    const url = new URL(location.href);
    url.searchParams.set('name', typed);
    history.replaceState(null, '', url);
    if (record) recordNamerPlayed(removal.found);
  }

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('name');
    if (fromUrl) {
      const typed = fromUrl.replace(/\s+/g, ' ').trim().slice(0, 64);
      setInput(Array.from(typed).slice(0, MAX_NAME_LENGTH).join(''));
      void launch(typed, true);
    }
    const onResize = () => fit();
    addEventListener('resize', onResize);
    return () => {
      removeEventListener('resize', onResize);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div class="namer-game">
      <form
        autocomplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void launch(input, true);
        }}
      >
        <div class="field">
          <label for="projName">{t('namer.label')}</label>
          <input
            id="projName"
            name="name"
            type="text"
            maxLength={MAX_NAME_LENGTH}
            placeholder={t('namer.placeholder')}
            required
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          />
        </div>
        <button class="btn btn-ink submit" type="submit">
          {t('namer.submit')}
        </button>
      </form>
      <div class="namer-out" ref={outRef} hidden={!result} aria-live="polite">
        <div ref={boardRef} class="namer-board" />
        <div class="namer-verdict">
          <div class="was">{result?.was}</div>
          <div class="now">{result?.now}</div>
          <p>{result?.text}</p>
        </div>
      </div>
    </div>
  );
}
