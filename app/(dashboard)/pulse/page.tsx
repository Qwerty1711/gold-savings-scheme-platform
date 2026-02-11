import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { PulseClient } from './pulse-client';

export default async function PulsePage() {
  const cookieStore = cookies(); // ✅ SSR RequestCookies

  // Get access & refresh token from HTTP-only cookies
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    console.warn('No active session. Redirecting to login.');
    redirect('/login');
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieStore, // Pass the cookies object
    }
  );

  // Use supabase.auth.getUser() on server
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch retailer profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('retailer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.retailer_id) {
    return <div className="flex items-center justify-center h-64 text-red-600">
      No retailer associated with your account. Please contact support.
    </div>;
  }

  // Fetch dashboard metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data: metricsData } = await supabase.rpc('get_dashboard_metrics', {
    p_retailer_id: profile.retailer_id,
    p_start_date: startOfMonth.toISOString(),
    p_end_date: endOfMonth.toISOString(),
  });

  return <PulseClient initialMetrics={metricsData || {}} />;
}
