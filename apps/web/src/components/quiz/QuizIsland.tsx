import {
  type Answer,
  currentIndex,
  EMPTY_SESSION,
  isComplete,
  PILLARS,
  QUESTIONS,
  type QuizAction,
  type QuizSession,
  quizReducer,
  resultCode,
  resumeSession,
  sessionNails,
  WORD,
} from '@beda/core';
import { renderTransom } from '@beda/transom';
import { attachTransom, type TransomController } from '@beda/transom/client';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { fmt, t } from '../../i18n/ru';
import { recordQuizAttempt } from '../../lib/api';
import { clearSession, loadSession, saveReveal, saveSession } from '../../lib/quiz-storage';

const ANSWERS: { value: Answer; label: string; cls: string }[] = [
  { value: 1, label: t('quiz.yes'), cls: 'btn' },
  { value: 0.5, label: t('quiz.partly'), cls: 'btn' },
  { value: 0, label: t('quiz.no'), cls: 'btn no' },
];

/** Where the quiz was started from, e.g. `?from=home` (short slug only). */
function sourceParam(): string | undefined {
  const from = new URLSearchParams(location.search).get('from') ?? '';
  return /^[a-z0-9_-]{1,32}$/.test(from) ? from : undefined;
}

export default function QuizIsland() {
  // The server renders question 1; the stored session is applied after hydration.
  const [session, setSession] = useState<QuizSession>(EMPTY_SESSION);
  const transomRef = useRef<HTMLDivElement>(null);
  const controller = useRef<TransomController | null>(null);
  const firstApply = useRef(true);
  const transomHtml = useMemo(
    () => renderTransom({ letters: WORD, nails: sessionNails(EMPTY_SESSION) }),
    [],
  );

  useEffect(() => {
    const el = transomRef.current?.firstElementChild;
    if (el instanceof HTMLElement) controller.current = attachTransom(el);
    const params = new URLSearchParams(location.search);
    if (params.has('restart')) {
      clearSession();
      params.delete('restart');
      const query = params.toString();
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
      return;
    }
    const stored = resumeSession(loadSession());
    if (stored.answers.length) setSession(stored);
  }, []);

  useEffect(() => {
    controller.current?.set(sessionNails(session), { animate: !firstApply.current });
    firstApply.current = false;
  }, [session]);

  function dispatch(action: QuizAction) {
    const next = quizReducer(session, action);
    if (isComplete(next)) {
      const code = resultCode(next);
      saveSession(next);
      saveReveal(code, sessionNails(next));
      controller.current?.set(sessionNails(next));
      recordQuizAttempt(code, sourceParam());
      location.assign(`/osmotr/r/${code}`);
      return;
    }
    saveSession(next);
    setSession(next);
  }

  const i = currentIndex(session);
  const q = QUESTIONS[i] ?? QUESTIONS[0];
  if (!q) return null;
  const n = session.answers.length;

  return (
    <div class="quiz-run">
      <div class="wrap quiz-top">
        <div class="quiz-bar">
          <span class="mono count">{fmt(t('quiz.count'), { n: i + 1 })}</span>
          <div
            class="progress"
            role="progressbar"
            aria-label={t('quiz.progressLabel')}
            aria-valuemin={0}
            aria-valuemax={12}
            aria-valuenow={n}
          >
            {/* No style on the server render (CSP forbids style attributes); the client sets it via CSSOM. */}
            <i style={n ? { width: `${(n / 12) * 100}%` } : undefined} />
          </div>
        </div>
        <a class="exit" href="/">
          {t('quiz.exit')}
        </a>
      </div>
      <section class="quiz">
        <div class="wrap">
          <div>
            <div ref={transomRef} dangerouslySetInnerHTML={{ __html: transomHtml }} />
            <p class="caption">{t('quiz.caption')}</p>
          </div>
          <div aria-live="polite">
            <div class="q-letter">
              <span class="box">{q.letter}</span>
              <span>
                {fmt(t('quiz.pillarOf'), { pillar: PILLARS[q.letter].name, n: (i % 2) + 1 })}
              </span>
            </div>
            <h1 class="q-text">{q.text}</h1>
            <p class="q-hint">{q.hint}</p>
            <div class="answers">
              {ANSWERS.map((a) => (
                <button
                  key={a.value}
                  class={a.cls}
                  type="button"
                  onClick={() => dispatch({ type: 'answer', value: a.value })}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div class="q-foot">
              <button
                class="linkbtn"
                type="button"
                disabled={n === 0}
                onClick={() => dispatch({ type: 'back' })}
              >
                {t('quiz.back')}
              </button>
              <span class="mono privacy">{t('quiz.privacy')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
