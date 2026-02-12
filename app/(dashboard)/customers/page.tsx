import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import CustomersClient from './customers-client'

export default async function CustomersPage() {
  const supabase = await createServerClient()

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
      return (
        <CustomersClient
          customers={[]}
          loading={false}
          error="User profile not found."
          rlsError={false}
        />
      )
    }

    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('retailer_id', profile.retailer_id)
      .order('created_at', { ascending: false })

    if (customersError) {
      const isRLSError =
        customersError.code === 'PGRST301' ||
        customersError.message?.includes('RLS') ||
        customersError.message?.includes('policy')

      return (
        <CustomersClient
          customers={[]}
          loading={false}
          error={
            isRLSError
              ? 'Database access denied (RLS policy issue).'
              : customersError.message
          }
          rlsError={isRLSError}
        />
      )
    }

    return (
      <CustomersClient
        customers={customers || []}
        loading={false}
        retailerName={profile.full_name || 'Unknown'}
        error={null}
        rlsError={false}
      />
    )
  } catch (error) {
    console.error('Customers unexpected error:', error)
    return (
      <CustomersClient
        customers={[]}
        loading={false}
        error="Unexpected error occurred."
        rlsError={false}
      />
    )
  }
}
