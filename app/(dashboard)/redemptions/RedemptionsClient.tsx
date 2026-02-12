'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { PaginatedRedemptions, EligibleEnrollment, CurrentRates } from './types'

interface Props {
  redemptions: PaginatedRedemptions
  eligibleEnrollments: EligibleEnrollment[]
  currentRates: CurrentRates
  currentPage: number
  totalPages: number
}

export default function RedemptionsClient({
  redemptions,
  eligibleEnrollments,
  currentRates,
  currentPage,
  totalPages,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateQuery(params: Record<string, string | number>) {
    const query = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) =>
      query.set(key, String(value))
    )

    router.push(`?${query.toString()}`)
  }

  return (
    <div className="space-y-6">

      {/* Your existing dashboard cards remain unchanged */}

      {/* Example pagination */}
      <div className="flex gap-2">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => updateQuery({ page: i + 1 })}
            className={`px-3 py-1 border ${
              currentPage === i + 1 ? 'bg-black text-white' : ''
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

    </div>
  )
}
