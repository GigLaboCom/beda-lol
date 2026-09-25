import { describe, expect, it } from 'vitest';
import { pickActions, scoresFromStates } from './quiz';
import {
  currentIndex,
  EMPTY_SESSION,
  isComplete,
  parseSession,
  type QuizSession,
  quizReducer,
  resultCode,
  resumeSession,
  sessionNails,
} from './quiz-session';

const play = (values: (0 | 0.5 | 1)[]): QuizSession =>
  values.reduce<QuizSession>(
    (s, value) => quizReducer(s, { type: 'answer', value }),
    EMPTY_SESSION,
  );

describe('quizReducer', () => {
  it('answers, goes back and restarts', () => {
    let s = play([1, 0]);
    expect(s.answers).toEqual([1, 0]);
    expect(currentIndex(s)).toBe(2);
    expect(sessionNails(s)).toEqual([2, 4, 4, 4, 4, 4]);
    s = quizReducer(s, { type: 'back' });
    expect(s.answers).toEqual([1]);
    expect(quizReducer(EMPTY_SESSION, { type: 'back' })).toBe(EMPTY_SESSION);
    expect(quizReducer(s, { type: 'restart' })).toEqual(EMPTY_SESSION);
  });

  it('stops at twelve answers', () => {
    const s = play(Array(12).fill(1));
    expect(isComplete(s)).toBe(true);
    expect(currentIndex(s)).toBe(11);
    expect(quizReducer(s, { type: 'answer', value: 0 })).toBe(s);
  });

  it('produces the result code', () => {
    // П and О fall, the rest nailed.
    expect(resultCode(play([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]))).toBe('002222');
    // П hangs (score 0.5), Д at 1.5 → 3 nails → state 2.
    expect(resultCode(play([0.5, 0, 1, 1, 1, 1, 1, 1, 1, 0.5, 1, 1]))).toBe('122222');
  });

  it('resumes a finished session on the last question', () => {
    const s = play(Array(12).fill(1));
    expect(resumeSession(s).answers).toHaveLength(11);
    expect(resumeSession(play([1]))).toEqual(play([1]));
  });
});

describe('parseSession', () => {
  it('reads a stored session', () => {
    expect(parseSession('{"answers":[1,0.5,0]}')).toEqual({ answers: [1, 0.5, 0] });
  });

  it.each([
    null,
    '',
    'nope',
    '[]',
    '{"answers":[2]}',
    `{"answers":${JSON.stringify(Array(13).fill(1))}}`,
    'null',
  ])('treats %j as empty', (raw) => {
    expect(parseSession(raw)).toEqual(EMPTY_SESSION);
  });
});

describe('scoresFromStates', () => {
  it('maps states to approximate scores for actions', () => {
    expect(scoresFromStates([0, 1, 2, 2, 2, 2])).toEqual([0, 1, 2, 2, 2, 2]);
    expect(pickActions(scoresFromStates([0, 1, 2, 2, 2, 2])).map((a) => a.letter)).toEqual([
      'П',
      'О',
    ]);
  });
});
