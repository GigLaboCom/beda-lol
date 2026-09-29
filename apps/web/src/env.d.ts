/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** The signed-in user on on-demand pages (see `src/middleware.ts`); null otherwise. */
    auth: {
      userId: string;
      email: string | null;
      accessToken: string;
    } | null;
    supabase: import('@supabase/supabase-js').SupabaseClient | null;
  }
}
