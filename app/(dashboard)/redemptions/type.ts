// app/(dashboard)/redemptions/types.ts

export type RedemptionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'

export type Redemption = {
  id: string
  customer_name: string
  customer_phone: string

  enrollment_karat: string
  scheme_name: string

  gold_18k_grams: number
  gold_22k_grams: number
  gold_24k_grams: number
  silver_grams: number

  total_redemption_value: number

  redemption_status: RedemptionStatus

  redemption_date: string
  processed_at: string | null
  processed_by_name: string | null
}

export type EligibleEnrollment = {
  enrollment_id: string
  customer_id: string

  customer_name: string
  customer_phone: string

  plan_name: string
  karat: string

  eligible_date: string

  total_grams: number
  total_paid: number
}

export type CurrentRates = Record<string, number>

export type PaginatedRedemptions = {
  data: Redemption[]
  totalCount: number
}
