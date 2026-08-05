"use client"

import { useEffect, useState, type ReactNode } from "react"
import { LoaderIcon } from "lucide-react"

import { cn } from "@/lib/utils"
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
import type { BankAccount, CardData } from "@/lib/types"
import type { NewTransactionInput } from "@/server/mutations/transactions"

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: string[]
  accounts: BankAccount[]
  cards: CardData[]
  /** ISO yyyy-MM-dd the date field defaults to — the ledger's "today"
   * (LEDGER_ANCHOR), not the real calendar date; see @/server/db/generate. */
  defaultDate: string
  onAdd: (input: NewTransactionInput) => Promise<void>
}

type TxType = "expense" | "income"
type Status = "completed" | "pending" | "failed"

const STATUS_LABELS: Record<Status, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
}

// Select can't carry an empty-string value (its onValueChange guard treats
// "" as "no change" — see the account/category selects below), so "no card"
// needs its own sentinel value distinct from a real card id.
const NO_CARD = "none"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  cards,
  defaultDate,
  onAdd,
}: AddTransactionDialogProps) {
  const [merchant, setMerchant] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<TxType>("expense")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState(defaultDate)
  const [accountId, setAccountId] = useState("")
  const [cardId, setCardId] = useState(NO_CARD)
  const [status, setStatus] = useState<Status>("completed")
  const [notes, setNotes] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset whenever the dialog closes, whether the user dismissed it or the
  // parent closed it programmatically after a successful onAdd.
  useEffect(() => {
    if (!open) {
      setMerchant("")
      setAmount("")
      setType("expense")
      setCategory("")
      setDate(defaultDate)
      setAccountId("")
      setCardId(NO_CARD)
      setStatus("completed")
      setNotes("")
      setError(null)
    } else {
      // Pick sensible defaults each time it opens, in case categories/accounts
      // were empty on a previous open.
      setCategory((c) => c || categories[0] || "")
      setAccountId((id) => id || accounts[0]?.id || "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const parsedAmount = Number(amount)
  const canSubmit =
    merchant.trim() !== "" &&
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    category !== "" &&
    accountId !== "" &&
    date !== ""

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onAdd({
        merchant: merchant.trim(),
        amount: parsedAmount,
        type,
        category,
        date,
        accountId: Number(accountId),
        cardId: cardId !== NO_CARD ? Number(cardId) : undefined,
        status,
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add transaction — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Manually record an expense or income and keep the account balance in sync.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Type Toggle */}
          <div className="flex w-fit items-center rounded-lg border border-border p-0.5">
            {(["expense", "income"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setType(opt)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                  type === opt
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Merchant">
              <Input
                autoFocus
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Jollibee"
              />
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Account">
              <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
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
            <Field label="Status">
              <Select value={status} onValueChange={(v) => v && setStatus(v as Status)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: Status) => STATUS_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["completed", "pending", "failed"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Card (optional)">
            <Select value={cardId} onValueChange={(v) => v && setCardId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) =>
                    v === NO_CARD
                      ? "No card"
                      : (() => {
                          const c = cards.find((c) => c.id === v)
                          return c ? `${c.name} •••• ${c.last4}` : "No card"
                        })()
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CARD}>No card</SelectItem>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} •••• {c.last4}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Notes (optional)">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                  Adding…
                </>
              ) : (
                "Add transaction"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
