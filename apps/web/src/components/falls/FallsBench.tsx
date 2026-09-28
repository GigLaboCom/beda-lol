import { GAGS, type Gag, getGagCopy } from '@beda/core';
import { EN_LABEL_TEXT, finalOf, fitSize, fromOps, renderTransom } from '@beda/transom';
import { attachTransom, type TransomController } from '@beda/transom/client';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { fmt, type Locale, useTranslations } from '../../i18n';

type Filter = 'all' | Locale;

/**
 * The falls bench (dev): every gag of the catalogue on the v2 transom, a
 * stage that plays one, and a gallery of final states. Port of the page in
 * archive/src/transom-falls.html.
 */
export default function FallsBench({ lang = 'ru' }: { lang?: Locale }) {
  const t = useTranslations(lang);
  const labelText = lang === 'en' ? EN_LABEL_TEXT : undefined;
  const [current, setCurrent] = useState<Gag>(GAGS[0]);
  const [filter, setFilter] = useState<Filter>('all');
  const [slow, setSlow] = useState(false);
  const [debug, setDebug] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const stage = useRef<TransomController | null>(null);
  const copy = getGagCopy(current.id, lang);

  const minis = useMemo(
    () =>
      GAGS.map((g) =>
        renderTransom({
          state: finalOf(fromOps(g.text, g.ops), g.ops),
          labelText,
          idPrefix: `mini-${g.id}-`,
        }),
      ),
    [labelText],
  );

  function fit() {
    const host = stageRef.current;
    const wrap = host?.firstElementChild as HTMLElement | null | undefined;
    if (!host || !wrap) return;
    const size = fitSize(Array.from(current.text), host.clientWidth * 0.96, { min: 22, max: 104 });
    wrap.style.setProperty('--ts', `${size}px`);
  }

  // The stage board is plain DOM owned by the transom controller, not by Preact.
  useEffect(() => {
    const host = stageRef.current;
    if (!host) return;
    stage.current?.destroy();
    host.innerHTML = renderTransom({
      state: fromOps(current.text, current.ops),
      labelText,
      idPrefix: 'stage-',
      debug: true,
    });
    const root = host.firstElementChild;
    stage.current = root ? attachTransom(root) : null;
    stage.current?.debug(debug);
    setPlaying(false);
    setStatus('');
    fit();
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [current]);

  useEffect(() => {
    stage.current?.debug(debug);
  }, [debug]);

  function play() {
    const tr = stage.current;
    if (!tr) return;
    setPlaying(true);
    setStatus(t('falls.running'));
    tr.play(current.ops, {
      k: slow ? 2.5 : 1,
      onDone: () => {
        setPlaying(false);
        setStatus(fmt(t('falls.done'), { result: current.result }));
      },
    });
  }

  function reset() {
    stage.current?.reset();
    setPlaying(false);
    setStatus('');
  }

  function select(g: Gag) {
    setCurrent(g);
    const top = (stageRef.current?.closest('.stage') as HTMLElement | null)?.offsetTop ?? 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: top - 12, behavior: reduce ? 'auto' : 'smooth' });
  }

  const filters: Filter[] = ['all', 'ru', 'en'];
  return (
    <div class={`falls${debug ? ' debug' : ''}`}>
      <section class="stage" aria-labelledby="stTitle">
        <div class="stage-head">
          <div>
            <h2 class="stage-title display" id="stTitle">
              {current.text}
              <span class="arrow">→</span>
              {current.result}
            </h2>
            <div class="stage-meta mono">{fmt(t('falls.meta'), { meta: copy.meta })}</div>
            <p class="stage-joke">{copy.joke}</p>
          </div>
          <div class="controls" role="group" aria-label={t('falls.controls')}>
            <button class="btn btn-brass" type="button" onClick={play} disabled={playing}>
              {t('falls.play')}
            </button>
            <button class="btn" type="button" onClick={reset}>
              {t('falls.reset')}
            </button>
            <label>
              <input
                type="checkbox"
                checked={slow}
                onChange={(e) => setSlow((e.target as HTMLInputElement).checked)}
              />{' '}
              {t('falls.slow')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug((e.target as HTMLInputElement).checked)}
              />{' '}
              {t('falls.debug')}
            </label>
          </div>
        </div>
        <div class="stage-body" ref={stageRef} />
        <div class="status mono" role="status" aria-live="polite">
          {status}
        </div>
      </section>
      <div class="filter" role="group" aria-label={t('falls.filter')}>
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            class="btn btn-sm"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {t(`falls.${f}`)}
          </button>
        ))}
      </div>
      <p class="sect mono">{t('falls.hint')}</p>
      <div class="gallery">
        {GAGS.map((g, i) => (
          <button
            key={g.id}
            type="button"
            class="card"
            aria-pressed={g.id === current.id}
            hidden={!(filter === 'all' || g.lang === filter)}
            onClick={() => select(g)}
          >
            <span class="t display">
              {g.text} <span>→</span> {g.result}
            </span>
            <span class="m mono">{getGagCopy(g.id, lang).meta}</span>
            <span class="mini" dangerouslySetInnerHTML={{ __html: minis[i] ?? '' }} />
          </button>
        ))}
      </div>
    </div>
  );
}
