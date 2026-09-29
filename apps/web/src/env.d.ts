/// <reference types="astro/client" />

interface Window {
  /** Set by `/analytics.js` when GA is on (`src/lib/analytics.ts`). */
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  bedaAnalytics?: { id: string };
}

declare namespace App {
  interface Locals {
    /** The signed-in user on on-demand pages (see `src/middleware.ts`); null otherwise. */
    auth: {
      userId: string;
      email: string | null;
      /** Sign-in methods the user has (`email`, `github`, `google`, `x`), from the token's app metadata. */
      providers: string[];
      accessToken: string;
    } | null;
    supabase: import('@supabase/supabase-js').SupabaseClient | null;
  }
}
