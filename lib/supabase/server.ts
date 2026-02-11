import { createServerClient as createSupabaseServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * CRITICAL: This creates a Supabase client for Server Components
 * that properly handles user sessions and RLS policies.
 * 
 * The client uses cookies to maintain the user's session,
 * which is required for RLS policies to work correctly.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {}, // No-op for server-side rendering
        remove: () => {}, // No-op for server-side rendering
      },
    }
  );
}
