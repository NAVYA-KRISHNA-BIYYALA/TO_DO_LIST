import { createBrowserClient } from '@supabase/ssr';

// Browser Supabase client for Client Components.
// Uses the public anon key — RLS applies based on the user's session cookie.
// The service role key is NOT available here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
