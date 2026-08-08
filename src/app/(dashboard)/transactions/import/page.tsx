import { getAccounts } from "@/server/queries/accounts"
import { getCards } from "@/server/queries/cards"
import { getCategories } from "@/server/queries/categories"
import { ImportStatementPageClient } from "@/components/transactions/import/import-statement-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [categories, accounts, cards] = await Promise.all([
    getCategories(),
    getAccounts(),
    getCards(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ImportStatementPageClient
        categoryNames={categories.map((c) => c.name)}
        accounts={accounts}
        cards={cards}
      />
    </div>
  )
}
