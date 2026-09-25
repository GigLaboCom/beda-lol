/**
 * Fire-and-forget calls to the Rust API. They never throw and never block
 * navigation: statistics are nice to have, the visitor's flow is not.
 */
function send(path: string, body: unknown): void {
  const json = JSON.stringify(body);
  try {
    const blob = new Blob([json], { type: 'application/json' });
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(path, blob)) return;
  } catch {
    // fall through to fetch
  }
  try {
    void fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: json,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/** Anonymous record of a completed quiz: only the result code and where it started. */
export function recordQuizAttempt(code: string, source?: string): void {
  send('/api/quiz/attempts', source ? { code, source } : { code });
}

/** Name game played. Only whether a word was found — never the typed name. */
export function recordNamerPlayed(found: boolean): void {
  send('/api/events', { name: 'namer_played', props: { found } });
}
