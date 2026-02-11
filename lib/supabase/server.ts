import { createServerClient as createSupabaseServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * CRITICAL: Creates a Supabase client for Server Components
 * that properly handles user sessions and RLS policies.
 * Uses cookies to maintain the user's session.
 */

// Debug logs to verify environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('===== Supabase Environment Check =====');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Loaded ✅' : 'Undefined ❌');
console.log('======================================');

// Fail fast if env variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase environment variables are missing. Please check your .env.local:\n' +
    'NEXT_PUBLIC_SUPABASE_URL\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {}, // No-op for server-side rendering
        remove: () => {}, // No-op for server-side rendering
      },
    }
  );
}
