import {
  clampPageSize,
  getTransactionsPage,
  type TransactionFilters,
} from "@/server/queries/transactions"
import { getCategories } from "@/server/queries/categories"
import { getAccounts } from "@/server/queries/accounts"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
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

  const [transactionsPage, categories, accounts] = await Promise.all([
    getTransactionsPage(filters, { page, pageSize }),
    getCategories(),
    getAccounts(),
  ])
  const categoryNames = categories.map((c) => c.name)
  const categoryMeta = Object.fromEntries(
    categories.map((c) => [c.name, { iconName: c.iconName, color: c.color }])
  )

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <TransactionsPageClient
        transactionsPage={transactionsPage}
        categories={categoryNames}
        categoryMeta={categoryMeta}
        accounts={accounts}
        defaultDate={toISODate(LEDGER_ANCHOR)}
        filters={filters}
      />
    </div>
  )
}
