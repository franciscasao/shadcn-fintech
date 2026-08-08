"use client"

import { useState } from "react"
import { LoaderIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import type { CardPayment } from "@/lib/types"

interface PaymentHistoryProps {
  payments: CardPayment[]
  onDelete: (paymentId: string) => Promise<void>
}

const STATUS_VARIANT: Record<CardPayment["status"], "default" | "secondary" | "outline"> = {
  completed: "secondary",
  pending: "outline",
  scheduled: "outline",
}

const fmt = (n: number) =>
  `₱${new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

export function PaymentHistory({ payments, onDelete }: PaymentHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (deletingId) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        variant="generic"
        title="No payments yet"
        description="Payments toward this card's balance will show up here."
        className="py-8"
      />
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{fmt(p.amount)}</p>
              <Badge variant={STATUS_VARIANT[p.status]} className="capitalize">
                {p.status}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {p.date}
              {p.fromAccountName && <> · from {p.fromAccountName}</>}
              {p.note && <> · {p.note}</>}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={deletingId === p.id}
            onClick={() => handleDelete(p.id)}
          >
            {deletingId === p.id ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <Trash2Icon className="size-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  )
}
