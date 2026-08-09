import { getTransfers } from "@/server/queries/transfers"
import { getContacts } from "@/server/queries/contacts"
import { getAccounts } from "@/server/queries/accounts"
import { TransfersPageClient } from "@/components/transfers/transfers-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [transfers, contacts, accounts] = await Promise.all([
    getTransfers(),
    getContacts(),
    getAccounts(),
  ])
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <TransfersPageClient
        initialTransfers={transfers}
        contacts={contacts}
        accounts={accounts}
      />
    </div>
  )
}
