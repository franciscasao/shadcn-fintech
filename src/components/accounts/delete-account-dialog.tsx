"use client"

import { useEffect, useState } from "react"
import { LoaderIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { AccountImpact } from "@/server/queries/accounts"
import type { BankAccount } from "@/lib/types"

interface DeleteAccountDialogProps {
  account: BankAccount | null
  isOnlyAccount: boolean
  impact: AccountImpact | undefined
  onOpenChange: (open: boolean) => void
  onDelete: (accountId: string) => Promise<void>
}

/** Plain-language sentence fragments describing what deleting an account
 * will take with it (see deleteAccount() in @/server/mutations/accounts) —
 * omits any clause whose count is 0, and falls back to a reassuring line
 * when nothing is linked at all. */
function describeImpact(impact: AccountImpact | undefined): string {
  const clauses: string[] = []
  if (impact && impact.transactions > 0) {
    clauses.push(`delete ${impact.transactions} transaction${impact.transactions === 1 ? "" : "s"}`)
  }
  if (impact && impact.transfers > 0) {
    clauses.push(`delete ${impact.transfers} transfer${impact.transfers === 1 ? "" : "s"}`)
  }
  if (impact && impact.cards > 0) {
    clauses.push(`unlink ${impact.cards} card${impact.cards === 1 ? "" : "s"}`)
  }
  if (clauses.length === 0) return "It has no linked transactions, transfers, or cards."
  return `This will permanently ${clauses.join(", ")}.`
}

export function DeleteAccountDialog({
  account,
  isOnlyAccount,
  impact,
  onOpenChange,
  onDelete,
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setConfirmText("")
    setError(null)
  }, [account])

  const canSubmit = account !== null && !isOnlyAccount && confirmText.trim() === account.name

  async function handleSubmit() {
    if (!account || !canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onDelete(account.id)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete account — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            {isOnlyAccount ? (
              "This is your only account."
            ) : (
              <>
                Deleting <span className="font-medium text-foreground">{account?.name}</span> —{" "}
                {describeImpact(impact)} This can&apos;t be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isOnlyAccount ? (
          <p className="text-sm text-muted-foreground">
            Create another account before deleting this one — the app needs at least one to work.
          </p>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Type <span className="font-mono text-foreground">{account?.name}</span> to confirm
            </span>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={account?.name}
              autoComplete="off"
            />
          </label>
        )}

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
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete account"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
