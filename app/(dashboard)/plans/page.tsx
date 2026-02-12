import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { PlansClient } from './PlansClient'
import { PaginatedSchemes } from './types'

interface Props {
  searchParams: {
    page?: string
  }
}

export default async function PlansPage({ searchParams }: Props) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('retailer_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.retailer_id) redirect('/login')
  if (profile.role !== 'ADMIN') redirect('/c/schemes')

  const page = Number(searchParams.page ?? 1)
  const limit = 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  const schemesQuery = supabase
    .from('scheme_templates')
    .select(
      `
      id,
      name,
      installment_amount,
      duration_months,
      bonus_percentage,
      description,
      is_active,
      allow_self_enroll,
      created_at
      `,
      { count: 'exact' }
    )
    .eq('retailer_id', profile.retailer_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const [schemesRes, storesRes, statsRes] = await Promise.all([
    schemesQuery,
    supabase
      .from('stores')
      .select('id, name, code, is_active')
      .eq('retailer_id', profile.retailer_id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase.rpc('get_scheme_stats', {
      retailer_uuid: profile.retailer_id,
    }),
  ])

  if (schemesRes.error) throw schemesRes.error
  if (storesRes.error) throw storesRes.error
  if (statsRes.error) throw statsRes.error

  const schemeIds = schemesRes.data?.map((s) => s.id) ?? []

  let assignments: any[] = []

  if (schemeIds.length > 0) {
    const { data } = await supabase
      .from('scheme_store_assignments')
      .select('scheme_id, store_id')
      .eq('retailer_id', profile.retailer_id)
      .in('scheme_id', schemeIds)

    assignments = data ?? []
  }

  const paginated: PaginatedSchemes = {
    data: schemesRes.data ?? [],
    totalCount: schemesRes.count ?? 0,
  }

  return (
    <PlansClient
      schemes={paginated}
      schemeStats={statsRes.data ?? []}
      stores={storesRes.data ?? []}
      storeAssignments={assignments}
      retailerId={profile.retailer_id}
      currentPage={page}
      totalPages={Math.ceil((schemesRes.count ?? 0) / limit)}
    />
  )
}
