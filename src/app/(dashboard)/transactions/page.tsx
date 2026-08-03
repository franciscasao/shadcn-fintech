import {
  clampPageSize,
  getTransactionCategories,
  getTransactionsPage,
  type TransactionFilters,
} from "@/server/queries/transactions"
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams

  const filters: TransactionFilters = {
    search: first(sp.q),
    category: first(sp.category),
    status: first(sp.status),
    type: first(sp.type),
  }
  const page = Number(first(sp.page)) || 1
  const pageSize = clampPageSize(Number(first(sp.size)) || 25)

  const [transactionsPage, categories] = await Promise.all([
    getTransactionsPage(filters, { page, pageSize }),
    getTransactionCategories(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <TransactionsPageClient
        transactionsPage={transactionsPage}
        categories={categories}
        filters={filters}
      />
    </div>
  )
}
