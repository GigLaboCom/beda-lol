import { afterEach, describe, expect, it } from 'vitest';
import { apiBaseUrl, authConfig, safeNext } from './config';

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
  });
});

describe('authConfig', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('needs both the URL and the key', () => {
    delete process.env.BEDA_SUPABASE_URL;
    process.env.BEDA_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x';
    expect(authConfig()).toBeNull();
    process.env.BEDA_SUPABASE_URL = 'http://127.0.0.1:54321/';
    expect(authConfig()).toEqual({ url: 'http://127.0.0.1:54321', key: 'sb_publishable_x' });
  });

  it('reaches the API on localhost by default', () => {
    delete process.env.BEDA_API_URL;
    expect(apiBaseUrl()).toBe('http://localhost:8080');
    process.env.BEDA_API_URL = 'http://api:8080/';
    expect(apiBaseUrl()).toBe('http://api:8080');
  });
});
