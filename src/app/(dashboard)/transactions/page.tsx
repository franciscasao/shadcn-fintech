import {
  fromSearchParamsObject,
  getTransactionsPage,
  parseTransactionFilters,
  parseTransactionPaging,
  parseTransactionSort,
} from "@/server/queries/transactions"
import { getCategories } from "@/server/queries/categories"
import { getAccounts } from "@/server/queries/accounts"
import { getCards } from "@/server/queries/cards"
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const src = fromSearchParamsObject(await searchParams)
  const filters = parseTransactionFilters(src)
  const sort = parseTransactionSort(src)
  const { page, pageSize } = parseTransactionPaging(src)

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
        categories={categories}
        categoryNames={categoryNames}
        categoryMeta={categoryMeta}
        accounts={accounts}
        cards={cards}
        filters={filters}
        sort={sort}
      />
    </div>
  )
}
