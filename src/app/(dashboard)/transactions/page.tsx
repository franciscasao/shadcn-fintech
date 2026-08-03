import { getTransactions } from "@/server/queries/transactions"
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const transactions = await getTransactions()
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <TransactionsPageClient initialTransactions={transactions} />
    </div>
  )
}
