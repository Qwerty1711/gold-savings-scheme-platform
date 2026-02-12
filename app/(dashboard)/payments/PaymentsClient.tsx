'use client'

import { useRouter } from 'next/navigation'
import { PaginatedTransactions, GoldRate } from './types'

interface Props {
  transactions: PaginatedTransactions
  goldRate: GoldRate | null
  currentPage: number
  search: string
  txnType: string
  itemsPerPage: number
}

export default function PaymentsClient({
  transactions,
  goldRate,
  currentPage,
  search,
  txnType,
  itemsPerPage,
}: Props) {
  const router = useRouter()

  const totalPages = Math.ceil(
    transactions.totalCount / itemsPerPage
  )

  function updateQuery(params: Record<string, string | number>) {
    const query = new URLSearchParams({
      page: String(currentPage),
      search,
      txnType,
      ...params,
    })

    router.push(`?${query.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input
          value={search}
          onChange={(e) =>
            updateQuery({ search: e.target.value, page: 1 })
          }
          placeholder="Search by mode..."
          className="border px-3 py-2 rounded"
        />

        <select
          value={txnType}
          onChange={(e) =>
            updateQuery({ txnType: e.target.value, page: 1 })
          }
          className="border px-3 py-2 rounded"
        >
          <option value="ALL">All</option>
          <option value="PAYMENT">Payments</option>
          <option value="REDEMPTION">Redemptions</option>
        </select>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Mode</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {transactions.data.map((txn) => (
            <tr key={txn.id}>
              <td>{new Date(txn.paid_at).toLocaleDateString()}</td>
              <td>{txn.amount_paid}</td>
              <td>{txn.payment_status}</td>
              <td>{txn.mode}</td>
              <td>{txn.txn_type}</td>
            </tr>
          ))}
        </tbody>
      </table>

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

      {goldRate && (
        <div className="text-sm text-gray-500">
          Current Gold Rate ({goldRate.karat}): ₹
          {goldRate.rate_per_gram}
        </div>
      )}
    </div>
  )
}
