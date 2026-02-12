'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type {
  PaginatedSchemes,
  SchemeStatistics,
  Store,
  StoreAssignment,
} from './types'

type Props = {
  schemes: PaginatedSchemes
  schemeStats: SchemeStatistics[]
  stores: Store[]
  storeAssignments: StoreAssignment[]
  retailerId: string
  currentPage: number
  totalPages: number
}

export function PlansClient({
  schemes,
  schemeStats,
  stores,
  storeAssignments,
  retailerId,
  currentPage,
  totalPages,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updatePage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-6">

      {/* your existing UI remains unchanged */}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => updatePage(i + 1)}
              className={`px-3 py-1 border ${
                currentPage === i + 1 ? 'bg-black text-white' : ''
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
