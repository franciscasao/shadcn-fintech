"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import type { BankAccount, CardData, CardPayment } from "@/lib/types"
import type { NewCardInput } from "@/lib/ph-cards"
import { InteractiveCard } from "@/components/cards/interactive-card"
import { CardControls } from "@/components/cards/card-controls"
import { CreditSummaryPanel } from "@/components/cards/credit-summary"
import { IssueCard } from "@/components/cards/issue-card"
import { CardList } from "@/components/cards/card-list"
import { EmptyState } from "@/components/empty-state"

interface CardsPageClientProps {
  initialCards: CardData[]
  initialPayments: CardPayment[]
  accounts: BankAccount[]
  holderName: string
}

export function CardsPageClient({
  initialCards,
  initialPayments,
  accounts,
  holderName,
}: CardsPageClientProps) {
  const router = useRouter()
  const cards = initialCards
  const payments = initialPayments
  const [activeCardId, setActiveCardId] = useState<string>(initialCards[0]?.id)
  // Live slider value while dragging, separate from the committed server value —
  // avoids firing a network request on every tick of the drag.
  const [liveDailyLimit, setLiveDailyLimit] = useState<number | null>(null)

  const activeCard = cards.find((c) => c.id === activeCardId) ?? cards[0]
  const activeCardPayments = payments.filter((p) => p.cardId === activeCard?.id)
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
    async (input: NewCardInput) => {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Failed to create card")
      }
      const card: CardData = await res.json()
      setActiveCardId(card.id)
      router.refresh()
      return card
    },
    [router]
  )

  const handlePay = useCallback(
    async (input: { fromAccountId: string; amount: number; date: string; note?: string }) => {
      const res = await fetch("/api/card-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: activeCard.id, ...input }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Failed to record payment")
      }
      router.refresh()
    },
    [activeCard, router]
  )

  const handleDeletePayment = useCallback(
    async (paymentId: string) => {
      await fetch(`/api/card-payments/${paymentId}`, { method: "DELETE" })
      router.refresh()
    },
    [router]
  )

  const handleUpdateCreditTerms = useCallback(
    async (terms: { creditLimit: number; apr: number; statementDay: number; dueDay: number }) => {
      const res = await fetch(`/api/cards/${activeCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(terms),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Failed to update credit terms")
      }
      router.refresh()
    },
    [activeCard, router]
  )

  if (!activeCard) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <EmptyState
            variant="cards"
            title="No cards yet"
            description="Issue a physical or virtual card to start spending — see the panel on the right."
          />
        </div>
        <div className="lg:col-span-4">
          <IssueCard accounts={accounts} holderName={holderName} onCardCreated={handleCardCreated} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Main column: card preview + controls + credit summary */}
      <div className="space-y-6 lg:col-span-8">
        <div className="flex justify-start">
          <InteractiveCard card={activeCard} frozen={activeCard.frozen} />
        </div>
        <CardControls
          card={activeCard}
          frozen={activeCard.frozen}
          onToggleFreeze={toggleFreeze}
          dailyLimit={liveDailyLimit ?? activeCard.dailyLimit}
          onDailyLimitChange={handleDailyLimitChange}
          onDailyLimitCommit={handleDailyLimitCommit}
          onUpdateCreditTerms={handleUpdateCreditTerms}
        />
        {activeCard.product === "credit" && activeCard.credit && (
          <CreditSummaryPanel
            card={activeCard}
            credit={activeCard.credit}
            accounts={accounts}
            payments={activeCardPayments}
            onPay={handlePay}
            onDeletePayment={handleDeletePayment}
          />
        )}
      </div>

      {/* Right rail: issue-card panel + card selector, pinned while the main column scrolls */}
      <div className="lg:col-span-4">
        <div className="space-y-4 lg:sticky lg:top-4">
          <IssueCard accounts={accounts} holderName={holderName} onCardCreated={handleCardCreated} />
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
