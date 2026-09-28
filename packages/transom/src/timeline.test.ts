// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { opDuration, SWING_KEYFRAMES, TIMELINE } from './timeline';

// transom.css still has the durations written out until S08c generates them
// from TIMELINE; this keeps the two in step meanwhile.
const css = readFileSync(new URL('./transom.css', import.meta.url), 'utf8');
const s = (ms: number) => `${ms / 1000}s`;

describe('timeline', () => {
  it('falls when the swing ends', () => {
    expect(TIMELINE.fallAt).toBe(TIMELINE.hangAt + TIMELINE.swing);
    expect(opDuration('fall')).toBe(3770);
    expect(opDuration('brk')).toBe(1270);
  });

  it('matches the durations in transom.css', () => {
    expect(css).toContain(`animation: transom-swing ${s(TIMELINE.swing)} ease-out`);
    expect(css).toContain(`transition: transform ${s(TIMELINE.fall)} `);
    expect(css).toContain(`transform ${s(TIMELINE.nailPop)} `);
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
