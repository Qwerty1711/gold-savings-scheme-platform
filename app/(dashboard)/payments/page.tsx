import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import PaymentsClient from './PaymentsClient'
import { PaginatedTransactions } from './types'

interface Props {
  searchParams: {
    page?: string
    search?: string
    txnType?: string
  }
}

export default async function PaymentsPage({ searchParams }: Props) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.retailer_id) redirect('/login')

  if (profile.role !== 'ADMIN') redirect('/unauthorized')

  const page = Number(searchParams.page ?? 1)
  const search = searchParams.search ?? ''
  const txnType = searchParams.txnType ?? 'ALL'
  const itemsPerPage = 10
  const from = (page - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('retailer_id', profile.retailer_id)

  if (txnType === 'PAYMENT') {
    query = query.eq('txn_type', 'PAYMENT')
  } else if (txnType === 'REDEMPTION') {
    query = query.eq('txn_type', 'REDEMPTION')
  }

  if (search) {
    query = query.ilike('mode', `%${search}%`)
  }

  const { data, count, error } = await query
    .order('paid_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error(error)
    redirect('/login')
  }

  const { data: goldRate } = await supabase
    .from('gold_rates')
    .select('*')
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  const paginated: PaginatedTransactions = {
    data: data ?? [],
    totalCount: count ?? 0,
  }

  return (
    <PaymentsClient
      transactions={paginated}
      goldRate={goldRate}
      currentPage={page}
      search={search}
      txnType={txnType}
      itemsPerPage={itemsPerPage}
    />
  )
}
