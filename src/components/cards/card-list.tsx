"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { InstitutionLogo } from "@/components/accounts/institution-logo"
import type { CardData } from "@/lib/types"

interface CardListProps {
  cards: CardData[]
  activeCardId: string
  onSelect: (id: string) => void
  frozenMap: Record<string, boolean>
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function CardList({
  cards,
  activeCardId,
  onSelect,
  frozenMap,
}: CardListProps) {
  return (
    <div className="flex max-h-[420px] flex-col gap-2.5 overflow-y-auto p-1 -m-1">
      {cards.map((card) => {
        const isFrozen = frozenMap[card.id] ?? false
        const isActive = card.id === activeCardId

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(card.id)}
            className={cn(
              "relative aspect-[3.2/1] w-full cursor-pointer overflow-hidden rounded-xl p-3 text-left transition-all",
              card.color,
              isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              isFrozen && "opacity-50 grayscale",
            )}
          >
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  {card.issuerLogo && <InstitutionLogo src={card.issuerLogo} size={14} />}
                  <span className="truncate text-xs font-medium leading-tight">
                    {card.name}
                  </span>
                </div>
                <Image
                  src={card.network === "visa" ? "/logos/visa-com.svg" : "/logos/mastercard-com.svg"}
                  alt={card.network}
                  width={32}
                  height={20}
                  className="h-5 w-auto shrink-0 object-contain"
                />
              </div>
              <div className="flex items-end justify-between gap-1">
                <p className="font-mono text-xs tabular-nums opacity-80">
                  **** {card.last4}
                </p>
                <p className="text-xs font-medium tabular-nums opacity-70">
                  {formatCurrency(card.monthlySpend)} spent
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
