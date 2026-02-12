export type SchemeTemplate = {
  id: string
  name: string
  installment_amount: number
  duration_months: number
  bonus_percentage: number
  description: string | null
  is_active: boolean
  allow_self_enroll: boolean
  created_at: string
}

export type SchemeStatistics = {
  id: string
  name: string
  total_enrollments: number
  is_active: boolean
}

export type Store = {
  id: string
  name: string
  code: string | null
  is_active: boolean
}

export type StoreAssignment = {
  scheme_id: string
  store_id: string
}

export type PaginatedSchemes = {
  data: SchemeTemplate[]
  totalCount: number
}
