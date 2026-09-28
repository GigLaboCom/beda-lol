// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { opDuration, SWING_KEYFRAMES, TIMELINE } from './timeline';

// transom.css reads every duration from --t-* (set by the controller from
// TIMELINE); only the keyframe shapes are written out, so they are checked here.
const css = readFileSync(new URL('./transom.css', import.meta.url), 'utf8');

describe('timeline', () => {
  it('falls when the swing ends', () => {
    expect(TIMELINE.fallAt).toBe(TIMELINE.hangAt + TIMELINE.swing);
    expect(opDuration('fall')).toBe(3770);
    expect(opDuration('brk')).toBe(1270);
  });

  it('leaves no duration literal in transom.css', () => {
    expect(css).not.toMatch(/\d(\.\d+)?m?s\b/);
    for (const name of ['swing', 'fall', 'pop', 'crack', 'pdrop', 'settle']) {
      expect(css).toContain(`var(--t-${name})`);
    }
  });

  it('matches the swing keyframes in transom.css', () => {
    const block = css.slice(css.indexOf('@keyframes transom-swing'));
    for (const [offset, factor] of SWING_KEYFRAMES.slice(1, -1)) {
      expect(block).toContain(
        `${Math.round(offset * 100)}% {\n    transform: rotate(calc(var(--hang) * ${factor}));`,
      );
    }
  });
});
