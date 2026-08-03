import { getAccounts } from "@/server/queries/accounts"
import { AccountsPageClient } from "@/components/accounts/accounts-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const accounts = await getAccounts()
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <AccountsPageClient initialAccounts={accounts} />
    </div>
  )
}
