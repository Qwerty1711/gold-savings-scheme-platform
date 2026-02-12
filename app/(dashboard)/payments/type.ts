// app/(dashboard)/payments/types.ts

export type Customer = {
  id: string
  full_name: string | null
  phone: string | null
}

export type Store = {
  id: string
  name: string
  code: string | null
}

export type SchemeTemplate = {
  id: string
  name: string
  duration_months: number
  bonus_percentage: number
}

export type Enrollment = {
  id: string
  plan_id: string
  commitment_amount: number
  store_id: string | null
  karat: string
  scheme_template: SchemeTemplate
}

export type GoldRate = {
  id: string
  karat: string
  rate_per_gram: number
  effective_from: string
}

export type Txn = {
  id: string
  amount_paid: number
  paid_at: string
  payment_status: string
  mode: string | null
  grams_allocated_snapshot: number | null
  txn_type: 'PAYMENT' | 'REDEMPTION'
}

export type PaginatedTransactions = {
  data: Txn[]
  totalCount: number
}

export type MonthlyPaymentInfo = {
  billing_month: string
  commitment_amount: number
  total_paid: number
  remaining: number
  is_met: boolean
}
