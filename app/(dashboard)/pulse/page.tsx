import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { PulseClient } from './pulse-client';

export default async function PulsePage() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          cookieStore.getAll().map(c => ({
            name: c.name,
            value: c.value,
          })),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Example: fetch dashboard metrics
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('retailer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.retailer_id) {
    return <div className="text-red-600">No retailer associated with your account.</div>;
  }

  const metrics = await supabase
    .rpc('get_dashboard_metrics', {
      p_retailer_id: profile.retailer_id,
      p_start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      p_end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
    })
    .then(r => r.data);

  return <PulseClient initialMetrics={metrics} />;
}
