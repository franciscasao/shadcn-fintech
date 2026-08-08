"use client"

import { useState } from "react"
import { AlertTriangleIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { formatRate } from "@/lib/interest"
import { PayCardDialog } from "@/components/cards/pay-card-dialog"
import { PaymentHistory } from "@/components/cards/payment-history"
import type { BankAccount, CardData, CardPayment, CreditSummary } from "@/lib/types"

interface CreditSummaryPanelProps {
  card: CardData
  credit: CreditSummary
  accounts: BankAccount[]
  payments: CardPayment[]
  defaultDate: string
  onPay: (input: {
    fromAccountId: string
    amount: number
    date: string
    note?: string
  }) => Promise<void>
  onDeletePayment: (paymentId: string) => Promise<void>
}

const fmt = (n: number) =>
  `₱${new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

const STATUS_LABEL: Record<CreditSummary["status"], string> = {
  paid: "Paid",
  current: "Current",
  due_soon: "Due soon",
  overdue: "Overdue",
}

const STATUS_CLASS: Record<CreditSummary["status"], string> = {
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  current: "border-border text-foreground",
  due_soon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  overdue: "bg-destructive/10 text-destructive",
}

export function CreditSummaryPanel({
  card,
  credit,
  accounts,
  payments,
  defaultDate,
  onPay,
  onDeletePayment,
}: CreditSummaryPanelProps) {
  const [payOpen, setPayOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const dueLabel =
    credit.status === "overdue"
      ? `${Math.abs(credit.daysUntilDue)} day${Math.abs(credit.daysUntilDue) === 1 ? "" : "s"} overdue`
      : credit.status === "paid"
        ? `Next due ${credit.dueDate}`
        : `Due in ${credit.daysUntilDue} day${credit.daysUntilDue === 1 ? "" : "s"} (${credit.dueDate})`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Summary</CardTitle>
        <CardAction>
          <Badge variant="outline" className={cn(STATUS_CLASS[credit.status])}>
            {STATUS_LABEL[credit.status]}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Balance owed / available credit ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Balance owed</p>
            <p className="text-xl font-semibold tabular-nums">{fmt(credit.balanceOwed)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Available credit</p>
            <p className="text-xl font-semibold tabular-nums">{fmt(credit.availableCredit)}</p>
          </div>
        </div>

        {/* ── Utilization ── */}
        <div className="space-y-1.5">
          <Progress value={credit.utilization * 100} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{Math.round(credit.utilization * 100)}% used</span>
            <span>Limit {fmt(card.creditLimit ?? 0)}</span>
          </div>
        </div>

        {/* ── Statement / due ── */}
        <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
          <div>
            <p className="text-xs text-muted-foreground">Statement balance</p>
            <p className="text-sm font-medium tabular-nums">{fmt(credit.statementBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Minimum due</p>
            <p className="text-sm font-medium tabular-nums">{fmt(credit.minimumDue)}</p>
          </div>
          <div className="col-span-2 flex items-center justify-between border-t pt-2 text-xs">
            <span className={cn("font-medium", credit.status === "overdue" && "text-destructive")}>
              {dueLabel}
            </span>
            <span className="text-muted-foreground">{formatRate(card.apr)}</span>
          </div>
        </div>

        {/* Moot once the balance is already covered — a later payment can
            zero out balanceOwed even while the last statement's own
            (now-superseded) minimum-due math still computes to something
            nonzero. */}
        {credit.balanceOwed > 0 && credit.interestIfMinimumOnly > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Paying only the minimum leaves ~{fmt(credit.interestIfMinimumOnly)} in interest next
              cycle at {formatRate(card.apr)}.
            </p>
          </div>
        )}

        <Button
          className="w-full"
          disabled={credit.balanceOwed <= 0 || accounts.length === 0}
          onClick={() => setPayOpen(true)}
        >
          {credit.balanceOwed > 0 ? "Pay card" : "No balance due"}
        </Button>

        {/* ── Payment history ── */}
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 text-left">
            <span className="text-xs font-semibold text-muted-foreground">
              Payment history {payments.length > 0 && `(${payments.length})`}
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                historyOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-lg border px-3">
            <PaymentHistory payments={payments} onDelete={onDeletePayment} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <PayCardDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        card={card}
        credit={credit}
        accounts={accounts}
        defaultDate={defaultDate}
        onPay={onPay}
      />
    </Card>
  )
}
