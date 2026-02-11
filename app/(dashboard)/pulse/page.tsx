import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { PulseClient } from './pulse-client';

export default async function PulsePage() {
  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let metrics = {};
  try {
    // Use server-side Supabase client with SSR session
    const supabase = createServerComponentClient({ cookies });
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          Please log in to view dashboard metrics.
        </div>
      );
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