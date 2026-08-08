import Link from "next/link"
import { CreditCardIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CardData } from "@/lib/types"

const fmt = (n: number) =>
  `₱${new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

const STATUS_LABEL: Record<NonNullable<CardData["credit"]>["status"], string> = {
  paid: "Paid",
  current: "Current",
  due_soon: "Due soon",
  overdue: "Overdue",
}

const STATUS_CLASS: Record<NonNullable<CardData["credit"]>["status"], string> = {
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  current: "border-border text-foreground",
  due_soon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  overdue: "bg-destructive/10 text-destructive",
}

// Overdue first, then soonest due, then everything paid off at the bottom.
const STATUS_RANK: Record<NonNullable<CardData["credit"]>["status"], number> = {
  overdue: 0,
  due_soon: 1,
  current: 2,
  paid: 3,
}

/** Dashboard widget surfacing credit cards with a balance due — see
 * CreditSummary in @/lib/types for how balanceOwed/status are derived from
 * the ledger (getCards() in @/server/queries/cards). */
export function CardPaymentsDue({ cards }: { cards: CardData[] }) {
  const creditCards = cards
    .filter((c) => c.product === "credit" && c.credit)
    .sort((a, b) => STATUS_RANK[a.credit!.status] - STATUS_RANK[b.credit!.status])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CreditCardIcon className="size-4 text-primary" />
          Card Payments Due
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            nativeButton={false}
            render={<Link href="/cards" />}
          >
            View cards
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {creditCards.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No credit cards linked yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {creditCards.map((card) => {
              const credit = card.credit!
              return (
                <div key={card.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {credit.status === "overdue"
                        ? `${Math.abs(credit.daysUntilDue)} day${Math.abs(credit.daysUntilDue) === 1 ? "" : "s"} overdue`
                        : credit.status === "paid"
                          ? `Next due ${credit.dueDate}`
                          : `Due in ${credit.daysUntilDue} day${credit.daysUntilDue === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{fmt(credit.balanceOwed)}</span>
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_CLASS[credit.status])}>
                      {STATUS_LABEL[credit.status]}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
