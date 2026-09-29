import { describe, expect, it } from 'vitest';
import { analyticsId, analyticsScript, GTAG_ORIGIN } from './analytics';

describe('analyticsId', () => {
  it('takes a GA4 measurement id', () => {
    expect(analyticsId(' g-abc123XYZ ')).toBe('G-ABC123XYZ');
  });

  it('is off for anything else', () => {
    for (const raw of [undefined, '', 'UA-12345-1', 'G-', 'G-abc"; alert(1)//', 'GTM-ABCD']) {
      expect(analyticsId(raw)).toBeNull();
    }
  });
});

describe('analyticsScript', () => {
  it('is empty without an id', () => {
    expect(analyticsScript(null)).not.toContain('gtag');
  });

  it('sets consent to denied before GA is configured, without its own page view', () => {
    const js = analyticsScript('G-TEST12345');
    const at = (s: string) => js.indexOf(s);
    expect(at("gtag('consent', 'default'")).toBeGreaterThan(-1);
    expect(at("gtag('consent', 'default'")).toBeLessThan(at("gtag('config'"));
    expect(js).toContain('"analytics_storage":"denied"');
    expect(js).toContain('send_page_view: false');
    expect(js).toContain(`${GTAG_ORIGIN}/gtag/js?id=G-TEST12345`);
  });

  it('runs as a script', () => {
    const pushed: unknown[] = [];
    const appended: { src?: string }[] = [];
    const window = { dataLayer: pushed } as Record<string, unknown>;
    const document = {
      createElement: () => ({}),
      head: { appendChild: (el: { src?: string }) => append(el) },
    };
    function append(el: { src?: string }) {
      appended.push(el);
    }
    new Function('window', 'document', analyticsScript('G-TEST12345'))(window, document);
    expect(window.bedaAnalytics).toEqual({ id: 'G-TEST12345' });
    expect(typeof window.gtag).toBe('function');
    expect(Array.from(pushed[0] as IArguments)).toEqual(['consent', 'default', expect.any(Object)]);
    expect(appended[0]?.src).toContain('gtag/js');
  });
});
