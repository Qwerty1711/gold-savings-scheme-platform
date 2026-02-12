import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { PulseClient } from './pulse-client'

export default async function PulsePage() {
  const supabase = await createServerClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect('/login')
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('retailer_id, role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.retailer_id) {
      console.error('Profile error:', profileError)
      return <PulseClient initialMetrics={{}} />
    }

    const { data: metrics, error: metricsError } = await supabase.rpc(
      'get_dashboard_metrics',
      {
        p_retailer_id: profile.retailer_id,
        p_start_date: startOfMonth.toISOString(),
        p_end_date: endOfMonth.toISOString(),
      }
    )

    if (metricsError) {
      console.error('RPC error:', metricsError)
      return <PulseClient initialMetrics={{}} />
    }

    return <PulseClient initialMetrics={metrics || {}} />
  } catch (error) {
    console.error('Pulse unexpected error:', error)
    return <PulseClient initialMetrics={{}} />
  }
}
