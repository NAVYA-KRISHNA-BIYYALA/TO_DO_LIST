import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cookie-based Supabase client for Server Components, API Routes, and Server Actions.
// Uses the anon key + user's session cookie — RLS applies normally.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies can't be set here.
            // The middleware handles session refresh for these cases.
          }
        },
      },
    }
  );
}

// Service-role client — bypasses RLS. Use only in trusted server-side code
// (admin operations, migration scripts). Never call from client components.
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false },
    }
  );
}
