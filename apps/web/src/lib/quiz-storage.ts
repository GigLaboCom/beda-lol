/**
 * Per-tab quiz state (sessionStorage). Every access is guarded: storage can
 * be unavailable (private mode, blocked cookies) and the quiz must still work.
 */
import { EMPTY_SESSION, type Nails, parseSession, type QuizSession } from '@beda/core';

const SESSION_KEY = 'beda-quiz-v1';
const REVEAL_KEY = 'beda-quiz-reveal-v1';

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadSession(): QuizSession {
  try {
    return parseSession(storage()?.getItem(SESSION_KEY) ?? null);
  } catch {
    return EMPTY_SESSION;
  }
}

export function saveSession(session: QuizSession): void {
  try {
    storage()?.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage full or blocked: the quiz works without resume.
  }
}

export function clearSession(): void {
  try {
    storage()?.removeItem(SESSION_KEY);
    storage()?.removeItem(REVEAL_KEY);
  } catch {
    // ignore
  }
}

/** Live nails at the moment the quiz ended, for the reveal on the result page. */
export function saveReveal(code: string, nails: Nails): void {
  try {
    storage()?.setItem(REVEAL_KEY, JSON.stringify({ code, nails }));
  } catch {
    // ignore
  }
}

/** Reads and forgets the reveal flag; only valid for the same result code. */
export function takeReveal(code: string): Nails | null {
  try {
    const raw = storage()?.getItem(REVEAL_KEY);
    storage()?.removeItem(REVEAL_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { code?: unknown; nails?: unknown };
    if (value.code !== code || !Array.isArray(value.nails) || value.nails.length !== 6) return null;
    const nails = value.nails.map(Number);
    return nails.every((n) => Number.isInteger(n) && n >= 0 && n <= 4) ? nails : null;
  } catch {
    return null;
  }
}
