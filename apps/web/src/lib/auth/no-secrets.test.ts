import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { authConfig } from './config';

// The Supabase secret key belongs to the API's server .env only (amendment П-1, rule 5).
// The site must neither read it nor hand it to islands, even when the process has it.

// Built at run time, so the secret scan (.gitleaks.toml) does not take the canary for a key.
const SECRET = ['sb', 'secret', 'canary', 'never', 'in', 'the', 'site'].join('_');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sources(join(dir, e.name))
      : /\.(ts|tsx|astro|mjs)$/.test(e.name) && !e.name.endsWith('.test.ts')
        ? [join(dir, e.name)]
        : [],
  );
}

describe('the Supabase secret key stays out of the site', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('is not in what authConfig hands to islands', () => {
    process.env.BEDA_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.BEDA_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x';
    process.env.BEDA_SUPABASE_SECRET_KEY = SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    expect(JSON.stringify(authConfig(true))).not.toContain(SECRET);
  });

  it('is never read by the site code', () => {
    const src = join(import.meta.dirname, '../..');
    const readers = sources(src).filter((f) =>
      /SUPABASE_SECRET|SERVICE_ROLE|service_role|sb_secret_/.test(readFileSync(f, 'utf8')),
    );
    expect(readers).toEqual([]);
  });
});
