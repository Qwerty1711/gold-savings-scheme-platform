import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import RedemptionsClient from './RedemptionsClient'
import { PaginatedRedemptions } from './types'

interface Props {
  searchParams: {
    page?: string
    status?: string
    search?: string
  }
}

export default async function RedemptionsPage({ searchParams }: Props) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('retailer_id, id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.retailer_id) redirect('/login')
  if (profile.role !== 'ADMIN') redirect('/unauthorized')

  const page = Number(searchParams.page ?? 1)
  const status = searchParams.status ?? 'ALL'
  const search = searchParams.search ?? ''
  const limit = 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('redemptions')
    .select(
      `
      id,
      redemption_status,
      redemption_date,
      total_redemption_value,
      gold_18k_grams,
      gold_22k_grams,
      gold_24k_grams,
      silver_grams,
      customers(full_name, phone),
      enrollments(karat, scheme_templates(name)),
      processed_by
    `,
      { count: 'exact' }
    )
    .eq('retailer_id', profile.retailer_id)

  if (status !== 'ALL') {
    query = query.eq('redemption_status', status)
  }

  if (search) {
    query = query.ilike('customers.full_name', `%${search}%`)
  }

  const { data, count, error } = await query
    .order('redemption_date', { ascending: false })
    .range(from, to)

  if (error) throw error

  const processedByIds = Array.from(
    new Set(data?.map((r: any) => r.processed_by).filter(Boolean))
  )

  let processedMap = new Map<string, string>()

  if (processedByIds.length > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', processedByIds)

    users?.forEach((u: any) =>
      processedMap.set(u.id, u.full_name)
    )
  }

  const redemptions = (data ?? []).map((r: any) => ({
    id: r.id,
    customer_name: r.customers?.full_name ?? 'Unknown',
    customer_phone: r.customers?.phone ?? '',
    enrollment_karat: r.enrollments?.karat ?? '22K',
    scheme_name: r.enrollments?.scheme_templates?.name ?? '',
    gold_18k_grams: r.gold_18k_grams ?? 0,
    gold_22k_grams: r.gold_22k_grams ?? 0,
    gold_24k_grams: r.gold_24k_grams ?? 0,
    silver_grams: r.silver_grams ?? 0,
    total_redemption_value: r.total_redemption_value ?? 0,
    redemption_status: r.redemption_status,
    redemption_date: r.redemption_date,
    processed_by_name: processedMap.get(r.processed_by) ?? null,
  }))

  const { data: eligible } = await supabase.rpc(
    'get_eligible_redemptions',
    { retailer_uuid: profile.retailer_id }
  )

  const { data: rates } = await supabase
    .from('gold_rates')
    .select('karat, rate_per_gram')
    .eq('retailer_id', profile.retailer_id)

  const rateMap: any = {
    '18K': 0,
    '22K': 0,
    '24K': 0,
    SILVER: 0,
  }

  rates?.forEach((r) => {
    rateMap[r.karat] = r.rate_per_gram
  })

  const paginated: PaginatedRedemptions = {
    data: redemptions,
    totalCount: count ?? 0,
  }

  return (
    <RedemptionsClient
      redemptions={paginated}
      eligibleEnrollments={eligible ?? []}
      currentRates={rateMap}
      currentPage={page}
      totalPages={Math.ceil((count ?? 0) / limit)}
    />
  )
}
