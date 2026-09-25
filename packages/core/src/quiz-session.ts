/**
 * Quiz session as a pure reducer, so the island stays a thin view.
 * The state is what the island keeps in sessionStorage.
 */
import { type Answer, finalNails, liveNails, type Nails, QUESTION_COUNT, scores } from './quiz';
import { encode, nailsToStates } from './result-code';

export interface QuizSession {
  answers: Answer[];
}

export type QuizAction = { type: 'answer'; value: Answer } | { type: 'back' } | { type: 'restart' };

export const EMPTY_SESSION: QuizSession = { answers: [] };

export function quizReducer(state: QuizSession, action: QuizAction): QuizSession {
  switch (action.type) {
    case 'answer':
      if (state.answers.length >= QUESTION_COUNT) return state;
      return { answers: [...state.answers, action.value] };
    case 'back':
      return state.answers.length ? { answers: state.answers.slice(0, -1) } : state;
    case 'restart':
      return EMPTY_SESSION;
  }
}

export function isComplete(state: QuizSession): boolean {
  return state.answers.length === QUESTION_COUNT;
}

/** Index of the question on screen (0..11); 11 when complete. */
export function currentIndex(state: QuizSession): number {
  return Math.min(state.answers.length, QUESTION_COUNT - 1);
}

export function sessionNails(state: QuizSession): Nails {
  return liveNails(state.answers);
}

/** Result code of a complete session, e.g. "002212". */
export function resultCode(state: QuizSession): string {
  return encode(nailsToStates(finalNails(scores(state.answers))));
}

const ANSWERS: readonly Answer[] = [0, 0.5, 1];

/** Validates a session read back from storage; anything odd becomes empty. */
export function parseSession(raw: string | null): QuizSession {
  if (!raw) return EMPTY_SESSION;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return EMPTY_SESSION;
    const answers = (value as { answers?: unknown }).answers;
    if (!Array.isArray(answers) || answers.length > QUESTION_COUNT) return EMPTY_SESSION;
    if (!answers.every((a) => ANSWERS.includes(a as Answer))) return EMPTY_SESSION;
    return { answers: answers as Answer[] };
  } catch {
    return EMPTY_SESSION;
  }
}

/**
 * When the visitor comes back from the result page, the last answer is taken
 * back so they land on question 12 instead of an empty screen.
 */
export function resumeSession(state: QuizSession): QuizSession {
  return isComplete(state) ? quizReducer(state, { type: 'back' }) : state;
}
