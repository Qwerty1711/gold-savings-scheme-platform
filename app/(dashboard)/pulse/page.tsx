import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { PulseClient } from './pulse-client';

export default async function PulsePage() {
  try {
    const cookieStore = await cookies(); // SSR-safe

    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      console.warn('No active session, redirecting to login.');
      redirect('/login');
    }

    // Create Supabase server client with session tokens
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );

    // Attach session manually for auth helpers
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('Session invalid, redirecting to login.', authError);
      redirect('/login');
    }

    // Fetch retailer_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('retailer_id')
      .eq('id', user.id)
      .maybeSingle();

    const retailerId = profile?.retailer_id;
    if (!retailerId) {
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          No retailer associated with your account. Please contact support.
        </div>
      );
    }

    // Fetch dashboard metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const { data: metrics, error } = await supabase.rpc('get_dashboard_metrics', {
      p_retailer_id: retailerId,
      p_start_date: startOfMonth.toISOString(),
      p_end_date: endOfMonth.toISOString(),
    });

    if (error) console.error('RPC error:', error);

    return <PulseClient initialMetrics={metrics || {}} />;
  } catch (err) {
    console.error('Error in PulsePage:', err);
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        An unexpected error occurred. Please try again.
      </div>
    );
  }
}
