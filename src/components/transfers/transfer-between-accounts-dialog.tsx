"use client"

import { useEffect, useState, type ReactNode } from "react"
import { LoaderIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import type { BankAccount } from "@/lib/types"
import type { NewInternalTransferInput } from "@/server/mutations/transfers"

interface TransferBetweenAccountsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: BankAccount[]
  /** ISO yyyy-MM-dd the date field defaults to — the ledger's "today"
   * (LEDGER_ANCHOR), not the real calendar date; see @/server/db/generate. */
  defaultDate: string
  /** Pre-selects the "From" account, e.g. when opened from an account card. */
  defaultFromAccountId?: string
  onSubmit: (input: NewInternalTransferInput) => Promise<void>
}

const fmt = (n: number, currency = "₱") =>
  `${currency}${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n))}`

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function TransferBetweenAccountsDialog({
  open,
  onOpenChange,
  accounts,
  defaultDate,
  defaultFromAccountId,
  onSubmit,
}: TransferBetweenAccountsDialogProps) {
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(defaultDate)
  const [note, setNote] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset whenever the dialog closes, whether the user dismissed it or the
  // parent closed it programmatically after a successful onSubmit.
  useEffect(() => {
    if (!open) {
      setFromAccountId("")
      setToAccountId("")
      setAmount("")
      setDate(defaultDate)
      setNote("")
      setError(null)
    } else {
      // Pick sensible defaults each time it opens.
      const from = defaultFromAccountId || accounts[0]?.id || ""
      setFromAccountId((id) => id || from)
      setToAccountId((id) => id || accounts.find((a) => a.id !== from)?.id || "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  const toOptions = accounts.filter((a) => a.id !== fromAccountId)
  const parsedAmount = Number(amount)
  const insufficientFunds =
    fromAccount != null && Number.isFinite(parsedAmount) && parsedAmount > fromAccount.balance

  const canSubmit =
    fromAccountId !== "" &&
    toAccountId !== "" &&
    fromAccountId !== toAccountId &&
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    !insufficientFunds &&
    date !== ""

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        fromAccountId: Number(fromAccountId),
        toAccountId: Number(toAccountId),
        amount: parsedAmount,
        date,
        note: note.trim() || undefined,
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't complete transfer — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer between accounts</DialogTitle>
          <DialogDescription>
            Move money between two of your own accounts — both balances and the
            transaction history update instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Select
                value={fromAccountId}
                onValueChange={(v) => {
                  if (!v) return
                  setFromAccountId(v)
                  if (v === toAccountId) setToAccountId("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account">
                    {(v: string) => accounts.find((a) => a.id === v)?.name ?? "Select account"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="To">
              <Select value={toAccountId} onValueChange={(v) => v && setToAccountId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account">
                    {(v: string) => accounts.find((a) => a.id === v)?.name ?? "Select account"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {toOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₱)">
              <Input
                autoFocus
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          {fromAccount && (
            <p
              className={
                insufficientFunds
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {insufficientFunds
                ? `Insufficient funds — ${fromAccount.name} only has ${fmt(fromAccount.balance, fromAccount.currency)}`
                : `Available in ${fromAccount.name}: ${fmt(fromAccount.balance, fromAccount.currency)}`}
            </p>
          )}

          <Field label="Note (optional)">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              rows={2}
            />
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
                  Transferring…
                </>
              ) : (
                "Transfer"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
