"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import type { CardData } from "@/lib/types"
import { InteractiveCard } from "@/components/cards/interactive-card"
import { CardControls } from "@/components/cards/card-controls"
import { VirtualCardGenerator, type NewVirtualCardInput } from "@/components/cards/virtual-card-generator"
import { CardList } from "@/components/cards/card-list"

export function CardsPageClient({ initialCards }: { initialCards: CardData[] }) {
  const router = useRouter()
  const cards = initialCards
  const [activeCardId, setActiveCardId] = useState<string>(initialCards[0]?.id)
  // Live slider value while dragging, separate from the committed server value —
  // avoids firing a network request on every tick of the drag.
  const [liveDailyLimit, setLiveDailyLimit] = useState<number | null>(null)

  const activeCard = cards.find((c) => c.id === activeCardId) ?? cards[0]
  const frozenMap = useMemo(
    () => Object.fromEntries(cards.map((c) => [c.id, c.frozen])),
    [cards]
  )

  const toggleFreeze = useCallback(async () => {
    await fetch(`/api/cards/${activeCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozen: !activeCard.frozen }),
    })
    router.refresh()
  }, [activeCard, router])

  const handleDailyLimitChange = useCallback((val: number) => {
    setLiveDailyLimit(val)
  }, [])

  const handleDailyLimitCommit = useCallback(
    async (val: number) => {
      await fetch(`/api/cards/${activeCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimit: val }),
      })
      setLiveDailyLimit(null)
      router.refresh()
    },
    [activeCard, router]
  )

  const handleCardCreated = useCallback(
    async (input: NewVirtualCardInput) => {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to create card")
      const card: CardData = await res.json()
      setActiveCardId(card.id)
      router.refresh()
    },
    [router]
  )

  return (
    <div className="space-y-6">
      {/* Row 1: Interactive card + controls */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex items-start justify-center lg:col-span-7">
          <InteractiveCard card={activeCard} frozen={activeCard.frozen} />
        </div>
        <div className="lg:col-span-5">
          <CardControls
            card={activeCard}
            frozen={activeCard.frozen}
            onToggleFreeze={toggleFreeze}
            dailyLimit={liveDailyLimit ?? activeCard.dailyLimit}
            onDailyLimitChange={handleDailyLimitChange}
            onDailyLimitCommit={handleDailyLimitCommit}
          />
        </div>
      </div>

      {/* Row 2: Virtual card generator + card list */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <VirtualCardGenerator onCardCreated={handleCardCreated} />
        </div>
        <div className="lg:col-span-8">
          <CardList
            cards={cards}
            activeCardId={activeCardId}
            onSelect={setActiveCardId}
            frozenMap={frozenMap}
          />
        </div>
      </div>
    </div>
  )
}
