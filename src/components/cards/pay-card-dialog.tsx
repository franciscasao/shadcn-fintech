"use client"

import { useEffect, useState, type ReactNode } from "react"
import { LoaderIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BankAccount, CardData, CreditSummary } from "@/lib/types"

interface PayCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CardData
  credit: CreditSummary
  accounts: BankAccount[]
  /** ISO yyyy-MM-dd the date field defaults to — the ledger's "today"
   * (LEDGER_ANCHOR), not the real calendar date; see @/server/db/generate. */
  defaultDate: string
  onPay: (input: {
    fromAccountId: string
    amount: number
    date: string
    note?: string
  }) => Promise<void>
}

const fmt = (n: number) =>
  `₱${new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function PayCardDialog({
  open,
  onOpenChange,
  card,
  credit,
  accounts,
  defaultDate,
  onPay,
}: PayCardDialogProps) {
  const [fromAccountId, setFromAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(defaultDate)
  const [note, setNote] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setFromAccountId("")
      setAmount("")
      setDate(defaultDate)
      setNote("")
      setError(null)
    } else {
      setFromAccountId((id) => id || accounts[0]?.id || "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedAccount = accounts.find((a) => a.id === fromAccountId)
  const parsedAmount = Number(amount)
  const canSubmit =
    fromAccountId !== "" &&
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    (!selectedAccount || parsedAmount <= selectedAccount.balance) &&
    date !== ""

  const quickFills = [
    { label: "Minimum due", value: credit.minimumDue },
    { label: "Statement balance", value: credit.statementBalance },
    { label: "Full balance", value: credit.balanceOwed },
  ].filter((q) => q.value > 0)

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onPay({
        fromAccountId,
        amount: parsedAmount,
        date,
        note: note.trim() || undefined,
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't record payment — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay {card.name}</DialogTitle>
          <DialogDescription>
            {fmt(credit.balanceOwed)} owed · {fmt(credit.availableCredit)} available credit
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label="From account">
            <Select value={fromAccountId} onValueChange={(v) => v && setFromAccountId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account">
                  {(v: string) => {
                    const a = accounts.find((a) => a.id === v)
                    return a ? `${a.name} — ${fmt(a.balance)}` : "Select account"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {fmt(a.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Amount (₱)">
            <Input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>

          {quickFills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickFills.map((q) => (
                <Button
                  key={q.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setAmount(String(q.value))}
                >
                  {q.label} · {fmt(q.value)}
                </Button>
              ))}
            </div>
          )}

          {selectedAccount && parsedAmount > selectedAccount.balance && (
            <p className="text-xs text-destructive">
              Exceeds {selectedAccount.name}&apos;s balance of {fmt(selectedAccount.balance)}.
            </p>
          )}

          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <Field label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button size="sm" className="flex-1" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <LoaderIcon className="size-4 animate-spin" />
                  Paying…
                </>
              ) : (
                "Pay card"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
