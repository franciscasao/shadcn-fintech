"use client"

import { useEffect, useState } from "react"
import { LoaderIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { BUDGET_ICONS, budgetIconMap } from "@/components/budgets/budget-icons"
import type { BudgetCategory } from "@/lib/types"

export type BudgetFormInput = {
  category: string
  budget: number
  iconName: string
}

interface BudgetDialogProps {
  target: BudgetCategory | null
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, input: BudgetFormInput) => Promise<void>
}

export function BudgetDialog({ target, onOpenChange, onUpdate }: BudgetDialogProps) {
  const [category, setCategory] = useState("")
  const [budget, setBudget] = useState("")
  const [iconName, setIconName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (target) {
      setCategory(target.category)
      setBudget(String(target.budget))
      setIconName(target.iconName)
      setError(null)
    }
  }, [target])

  const trimmed = category.trim()
  const numericBudget = Number(budget)
  const canSubmit =
    trimmed.length > 0 &&
    trimmed.length <= 24 &&
    iconName !== "" &&
    Number.isFinite(numericBudget) &&
    numericBudget >= 0

  async function handleSubmit() {
    if (!target || !canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onUpdate(target.id, { category: trimmed, budget: numericBudget, iconName })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save budget — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit budget</DialogTitle>
          <DialogDescription>
            Renaming moves every category filed under the old bucket name to the new one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <Input
              autoFocus
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={24}
              placeholder="Category name"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Monthly budget</span>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min={0}
              placeholder="Monthly budget"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Icon</span>
            <div className="flex flex-wrap gap-2">
              {BUDGET_ICONS.map((icon) => (
                <button
                  key={icon.name}
                  type="button"
                  aria-label={icon.label}
                  onClick={() => setIconName(icon.name)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border transition-colors",
                    iconName === icon.name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {budgetIconMap[icon.name]}
                </button>
              ))}
            </div>
          </div>
        </div>

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
