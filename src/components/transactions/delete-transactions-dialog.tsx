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
import type { DeleteTransactionsResult } from "@/server/mutations/transactions"

interface DeleteTransactionsDialogProps {
  ids: string[] | null
  onOpenChange: (open: boolean) => void
  onDelete: (ids: string[]) => Promise<DeleteTransactionsResult>
}

export function DeleteTransactionsDialog({
  ids,
  onOpenChange,
  onDelete,
}: DeleteTransactionsDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DeleteTransactionsResult | null>(null)

  useEffect(() => {
    setError(null)
    setResult(null)
  }, [ids])

  async function handleSubmit() {
    if (!ids || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await onDelete(ids)
      if (res.skipped > 0) {
        // Leave the dialog open to report which rows were skipped instead of
        // silently closing on a partial delete.
        setResult(res)
      } else {
        onOpenChange(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete transactions — try again")
    } finally {
      setSubmitting(false)
    }
  }

  const count = ids?.length ?? 0

  return (
    <Dialog open={ids !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {count === 1 ? "transaction" : `${count} transactions`}</DialogTitle>
          <DialogDescription>
            {count === 1
              ? "This transaction will be permanently deleted and its account balance adjusted. This can't be undone."
              : `${count} transactions will be permanently deleted and their account balances adjusted. This can't be undone.`}
          </DialogDescription>
        </DialogHeader>

        {result && result.skipped > 0 && (
          <p className="text-sm text-muted-foreground">
            Deleted {result.deleted} · {result.skipped} skipped — they&apos;re part of a
            transfer. Cancel those from the Transfers page.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          {result ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          ) : (
            <>
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
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <LoaderIcon className="size-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
