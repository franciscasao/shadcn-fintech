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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BudgetCategory } from "@/lib/types"

interface DeleteBudgetDialogProps {
  budget: BudgetCategory | null
  budgets: BudgetCategory[]
  onOpenChange: (open: boolean) => void
  onDelete: (id: string, reassignToId: string | null) => Promise<void>
}

const NONE = "none"

export function DeleteBudgetDialog({
  budget,
  budgets,
  onOpenChange,
  onDelete,
}: DeleteBudgetDialogProps) {
  const otherBudgets = budgets.filter((b) => b.id !== budget?.id)

  const [reassignTo, setReassignTo] = useState<string>(NONE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReassignTo(NONE)
    setError(null)
  }, [budget])

  async function handleSubmit() {
    if (!budget || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onDelete(budget.id, reassignTo === NONE ? null : reassignTo)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete budget — try again")
    } finally {
      setSubmitting(false)
    }
  }

  const hasCategories = (budget?.categoryCount ?? 0) > 0

  return (
    <Dialog open={budget !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete budget</DialogTitle>
          <DialogDescription>
            {hasCategories
              ? `${budget!.categoryCount} categor${budget!.categoryCount === 1 ? "y" : "ies"} roll${budget!.categoryCount === 1 ? "s" : ""} up into "${budget?.category}".`
              : `No categories roll up into "${budget?.category}".`}
          </DialogDescription>
        </DialogHeader>

        {hasCategories && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Move them to</span>
            <Select value={reassignTo} onValueChange={(v) => v && setReassignTo(v)}>
              <SelectTrigger>
                <SelectValue placeholder="None (unbucketed)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None (unbucketed)</SelectItem>
                {otherBudgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete budget"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
