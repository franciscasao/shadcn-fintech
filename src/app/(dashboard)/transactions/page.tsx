import {
  clampPageSize,
  getTransactionsPage,
  type TransactionFilters,
  type TransactionSort,
  type TransactionSortKey,
} from "@/server/queries/transactions"
import { getCategories } from "@/server/queries/categories"
import { getAccounts } from "@/server/queries/accounts"
import { getCards } from "@/server/queries/cards"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const SORT_KEYS: TransactionSortKey[] = ["merchant", "amount", "date", "status"]

/** Validates the `sort`/`dir` searchParams against the allowed columns —
 * these values reach a SQL `orderBy`, so anything outside this list is
 * rejected rather than passed through. Returns undefined when absent —
 * getTransactionsPage's own no-sort default already orders newest-first,
 * and the client keeps this distinct from an explicit date-desc sort so
 * clicking Date while on the default has an asc/desc cycle to move through
 * instead of "turning off" a sort that was never turned on. */
function parseSort(sp: { [key: string]: string | string[] | undefined }): TransactionSort | undefined {
  const key = first(sp.sort)
  const dir = first(sp.dir)
  if (!key || !SORT_KEYS.includes(key as TransactionSortKey)) return undefined
  return { key: key as TransactionSortKey, dir: dir === "asc" ? "asc" : "desc" }
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
  const sort = parseSort(sp)

  const [transactionsPage, categories, accounts, cards] = await Promise.all([
    getTransactionsPage(filters, { page, pageSize, sort }),
    getCategories(),
    getAccounts(),
    getCards(),
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
        cards={cards}
        defaultDate={toISODate(LEDGER_ANCHOR)}
        filters={filters}
        sort={sort}
      />
    </div>
  )
}
