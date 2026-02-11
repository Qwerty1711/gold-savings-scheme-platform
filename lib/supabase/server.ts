import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * CRITICAL: This creates a Supabase client for Server Components
 * that properly handles user sessions and RLS policies.
 * 
 * The client uses cookies to maintain the user's session,
 * which is required for RLS policies to work correctly.
 */
export function createServerClient() {
  const cookieStore = cookies();
  
  return createServerComponentClient(
    { cookies: () => cookieStore },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  );
}
