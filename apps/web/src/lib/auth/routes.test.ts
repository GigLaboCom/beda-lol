import { describe, expect, it } from 'vitest';
import { afterSignIn, signInHref } from './routes';

describe('signInHref', () => {
  it('carries the page to come back to', () => {
    expect(signInHref('ru', '/osmotr')).toBe('/voiti?next=%2Fosmotr');
    expect(signInHref('en', '/en/kabinet')).toBe('/en/voiti?next=%2Fen%2Fkabinet');
  });

  it('drops a pointless next', () => {
    expect(signInHref('ru')).toBe('/voiti');
    expect(signInHref('ru', '/voiti')).toBe('/voiti');
    expect(signInHref('en', '/en/voiti')).toBe('/en/voiti');
  });
});

describe('afterSignIn', () => {
  it('goes to a same-site next, else to the cabinet of the locale', () => {
    expect(afterSignIn(new URL('http://x/voiti?next=/osmotr'), 'ru')).toBe('/osmotr');
    expect(afterSignIn(new URL('http://x/voiti'), 'ru')).toBe('/kabinet');
    expect(afterSignIn(new URL('http://x/en/voiti'), 'en')).toBe('/en/kabinet');
    expect(afterSignIn(new URL('http://x/voiti?next=https://evil.example'), 'ru')).toBe('/kabinet');
  });
});
