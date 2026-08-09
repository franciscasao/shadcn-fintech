import { getCards } from "@/server/queries/cards"
import { getCardPayments } from "@/server/queries/card-payments"
import { getAccounts } from "@/server/queries/accounts"
import { getCurrentUser } from "@/server/queries/user"
import { CardsPageClient } from "@/components/cards/cards-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const [cards, payments, accounts, user] = await Promise.all([
    getCards(),
    getCardPayments(),
    getAccounts(),
    getCurrentUser(),
  ])
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <CardsPageClient
        initialCards={cards}
        initialPayments={payments}
        accounts={accounts}
        holderName={user.name}
      />
    </div>
  )
}
