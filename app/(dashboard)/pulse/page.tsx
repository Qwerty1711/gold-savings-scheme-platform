import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { PulseClient } from './pulse-client';

export default async function PulsePage() {
  try {
    // ✅ await cookies()
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().map((c) => ({
              name: c.name,
              value: c.value,
            }));
          },
          setAll() {
            // no-op for SSR page
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/login');
    }

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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const { data: metrics, error } = await supabase.rpc(
      'get_dashboard_metrics',
      {
        p_retailer_id: retailerId,
        p_start_date: startOfMonth.toISOString(),
        p_end_date: endOfMonth.toISOString(),
      }
    );

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
