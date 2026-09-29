import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isOAuthProvider, OAUTH_PROVIDERS, PROVIDER_NAMES, parseProviders } from './providers';

describe('parseProviders', () => {
  it('keeps known ids in the site order, once', () => {
    expect(parseProviders('x, Google ,github,google')).toEqual(['github', 'google', 'x']);
  });

  it('drops unknown ids and empty entries', () => {
    expect(parseProviders('twitter,,facebook,x')).toEqual(['x']);
    expect(parseProviders('')).toEqual([]);
  });
});

describe('providers', () => {
  it('has a name for every provider', () => {
    for (const id of OAUTH_PROVIDERS) expect(PROVIDER_NAMES[id]).toBeTruthy();
  });

  it('tells provider ids from other sign-in methods', () => {
    expect(isOAuthProvider('google')).toBe(true);
    expect(isOAuthProvider('email')).toBe(false);
  });
});

describe('the other places that list the providers', () => {
  const repo = (path: string) =>
    readFileSync(new URL(`../../../../../${path}`, import.meta.url), 'utf8');

  it('supabase-setup.sh configures the same providers', () => {
    const list = repo('deploy/scripts/supabase-setup.sh').match(
      /^OAUTH_PROVIDERS=\(([^)]*)\)$/m,
    )?.[1];
    expect(list?.split(' ')).toEqual([...OAUTH_PROVIDERS]);
  });

  it('the local stack enables every provider', () => {
    const config = repo('supabase/config.toml');
    for (const id of OAUTH_PROVIDERS) {
      expect(config).toMatch(new RegExp(`^\\[auth\\.external\\.${id}\\]\\nenabled = true$`, 'm'));
    }
  });
});
