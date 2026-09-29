import { afterEach, describe, expect, it } from 'vitest';
import { apiBaseUrl, authConfig, safeNext, TURNSTILE_TEST_SITE_KEY } from './config';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/dev/auth')).toBe('/dev/auth');
    expect(safeNext('/osmotr/r/002222?x=1')).toBe('/osmotr/r/002222?x=1');
  });

  it('turns everything else into /', () => {
    for (const bad of [
      null,
      undefined,
      '',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'dev/auth',
    ]) {
      expect(safeNext(bad)).toBe('/');
    }
    expect(safeNext('//evil.example', '/kabinet')).toBe('/kabinet');
  });
});

describe('authConfig', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('needs both the URL and the key', () => {
    delete process.env.BEDA_SUPABASE_URL;
    delete process.env.BEDA_AUTH_PROVIDERS;
    process.env.BEDA_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x';
    expect(authConfig()).toBeNull();
    process.env.BEDA_SUPABASE_URL = 'http://127.0.0.1:54321/';
    expect(authConfig(false)).toEqual({
      url: 'http://127.0.0.1:54321',
      key: 'sb_publishable_x',
      turnstile: null,
      providers: [],
    });
  });

  it('shows every OAuth provider in dev and none in production unless listed', () => {
    process.env.BEDA_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.BEDA_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x';
    delete process.env.BEDA_AUTH_PROVIDERS;
    expect(authConfig(true)?.providers).toEqual(['github', 'google', 'x']);
    expect(authConfig(false)?.providers).toEqual([]);
    process.env.BEDA_AUTH_PROVIDERS = 'google';
    expect(authConfig(true)?.providers).toEqual(['google']);
    process.env.BEDA_AUTH_PROVIDERS = '';
    expect(authConfig(true)?.providers).toEqual([]);
  });

  it('takes the Turnstile site key, with the test key only in dev', () => {
    process.env.BEDA_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.BEDA_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x';
    delete process.env.BEDA_TURNSTILE_SITE_KEY;
    expect(authConfig(true)?.turnstile).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(authConfig(false)?.turnstile).toBeNull();
    process.env.BEDA_TURNSTILE_SITE_KEY = ' 0x4AAAAreal ';
    expect(authConfig(false)?.turnstile).toBe('0x4AAAAreal');
  });

  it('reaches the API on localhost by default', () => {
    delete process.env.BEDA_API_URL;
    expect(apiBaseUrl()).toBe('http://localhost:8080');
    process.env.BEDA_API_URL = 'http://api:8080/';
    expect(apiBaseUrl()).toBe('http://api:8080');
  });
});
