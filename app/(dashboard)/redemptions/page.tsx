import { createServerClient } from '@/lib/supabase/server';
import { PulseClient } from './pulse-client';

export default async function PulsePage() {
  const supabase = await createServerClient();
  
  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Pulse auth error:', authError);
      return <PulseClient initialMetrics={{}} />;
    }
    
    console.log('✅ Pulse - User authenticated:', user.id);
    
    // 2. Get user's retailer_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('retailer_id, role, full_name')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || !profile.retailer_id) {
      console.error('❌ Pulse - Profile error:', profileError);
      console.error('❌ Pulse - Profile data:', profile);
      return <PulseClient initialMetrics={{}} />;
    }
    
    console.log('✅ Pulse - Profile loaded:', {
      retailerId: profile.retailer_id,
      role: profile.role,
    });
    
    // 3. Call RPC function to get dashboard metrics
    const { data: metrics, error: metricsError } = await supabase.rpc('get_dashboard_metrics', {
      p_retailer_id: profile.retailer_id,
      p_start_date: startOfMonth.toISOString(),
      p_end_date: endOfMonth.toISOString(),
    });
    
    if (metricsError) {
      console.error('❌ Pulse - RPC error:', metricsError);
      console.error('❌ Pulse - Error details:', {
        message: metricsError.message,
        code: metricsError.code,
        details: metricsError.details,
        hint: metricsError.hint,
      });
      return <PulseClient initialMetrics={{}} />;
    }
    
    console.log('✅ Pulse - Metrics loaded:', {
      hasData: !!metrics,
      periodCollections: metrics?.period_collections,
      totalEnrollments: metrics?.total_enrollments_period,
    });
    
    return <PulseClient initialMetrics={metrics || {}} />;
    
  } catch (error) {
    console.error('❌ Pulse - Unexpected error:', error);
    return <PulseClient initialMetrics={{}} />;
  }
}
