import { supabase } from '@/lib/supabase/client';
import { PulseClient } from './pulse-client';

export default async function PulsePage() {
  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let metrics = {};
  try {
    // Get user and retailer_id from user_profiles
    const { data: { user } } = await supabase.auth.getUser();
    let retailerId = '';
    if (user?.id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('retailer_id')
        .eq('id', user.id)
        .single();
      retailerId = profile?.retailer_id || '';
    }

    // Prevent RPC call if retailerId is empty
    if (!retailerId) {
      console.error('No retailerId found for user', user?.id);
      return <PulseClient initialMetrics={{}} />;
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
  }
  return <PulseClient initialMetrics={metrics} />;
}