// app/(dashboard)/pulse/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClient } from '@supabase/auth-helpers-nextjs';
import { PulseClient } from './pulse-client';

// Debug env logs
console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE ANON:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log("SERVICE ROLE:", process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function PulsePage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let metrics = {};

  try {
    // --- SSR cookie store ---
    const cookieStore = cookies();
    console.log('All cookies:', cookieStore.getAll());

    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},     // no-op on server
          remove: () => {},  // no-op on server
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('No active session. Redirecting to login.', authError);
      redirect('/login');
    }

    // Get retailer_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('retailer_id')
      .eq('id', user.id)
      .maybeSingle();

    const retailerId = profile?.retailer_id || '';
    if (profileError || !retailerId) {
      console.error('No retailerId found for user', user?.id, profileError);
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          No retailer associated with your account. Please contact support.
        </div>
      );
    }

    // Fetch dashboard metrics
    const { data, error } = await supabase.rpc('get_dashboard_metrics', {
      p_retailer_id: retailerId,
      p_start_date: startOfMonth.toISOString(),
      p_end_date: endOfMonth.toISOString(),
    });

    if (error) {
      console.error('Error fetching dashboard metrics:', error);
    } else {
      metrics = data || {};
    }

  } catch (error) {
    console.error('Error in PulsePage:', error);
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        An unexpected error occurred. Please try again.
      </div>
    );
  }

  return <PulseClient initialMetrics={metrics} />;
}
