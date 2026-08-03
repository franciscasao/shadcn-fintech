"use client"

import { useEffect, useState } from "react"
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
import type { BankAccount } from "@/lib/types"

interface EditBalanceDialogProps {
  account: BankAccount | null
  onOpenChange: (open: boolean) => void
  onSave: (accountId: string, balance: number) => Promise<void>
}

export function EditBalanceDialog({ account, onOpenChange, onSave }: EditBalanceDialogProps) {
  const [balance, setBalance] = useState("0")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (account) {
      setBalance(String(account.balance))
      setError(null)
    }
  }, [account])

  const parsed = Number(balance)
  const canSubmit = balance.trim() !== "" && Number.isFinite(parsed) && parsed >= 0

  async function handleSubmit() {
    if (!account || !canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSave(account.id, parsed)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update balance — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit balance</DialogTitle>
          <DialogDescription>
            {account
              ? `Manually correct the balance for ${account.name}.`
              : "Manually correct the account balance."}
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Balance (₱)</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            autoFocus
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </label>

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
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
