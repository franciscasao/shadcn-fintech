import { getCards } from "@/server/queries/cards"
import { CardsPageClient } from "@/components/cards/cards-page-client"

// Reads live data from SQLite on every request — see (dashboard)/layout.tsx.
export const dynamic = "force-dynamic"

export default async function Page() {
  const cards = await getCards()
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <CardsPageClient initialCards={cards} />
    </div>
  )
}
