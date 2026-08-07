import { getAccountImpacts, getAccounts } from "@/server/queries/accounts"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
import { AccountsPageClient } from "@/components/accounts/accounts-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [accounts, impacts] = await Promise.all([getAccounts(), getAccountImpacts()])
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <AccountsPageClient
        initialAccounts={accounts}
        impacts={impacts}
        defaultDate={toISODate(LEDGER_ANCHOR)}
      />
    </div>
  )
}
