/// <reference types="astro/client" />

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
