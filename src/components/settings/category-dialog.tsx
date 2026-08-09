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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BUDGET_ICONS, budgetIconMap } from "@/components/budgets/budget-icons"
import type { Category } from "@/lib/types"

export type CategoryFormInput = {
  name: string
  iconName: string
  budgetBucket: string | null
}

// `"new"` opens the dialog in create mode; a Category opens it pre-filled for
// editing; `null` keeps it closed. Mirrors the account-grid EditBalanceDialog
// convention of driving open/closed state off the target value itself.
export type CategoryDialogTarget = Category | "new" | null

interface CategoryDialogProps {
  target: CategoryDialogTarget
  /** Live budget bucket names (see getBudgetBuckets) — budgets are
   * user-managed (renamable/deletable) now, so this must be fetched rather
   * than a hardcoded list, or a renamed/deleted bucket would go stale here. */
  buckets: string[]
  onOpenChange: (open: boolean) => void
  onCreate: (input: CategoryFormInput) => Promise<void>
  onUpdate: (id: string, input: CategoryFormInput) => Promise<void>
}

const NO_BUCKET = "none"

export function CategoryDialog({ target, buckets, onOpenChange, onCreate, onUpdate }: CategoryDialogProps) {
  const isEdit = target !== null && target !== "new"

  const [name, setName] = useState("")
  const [iconName, setIconName] = useState("")
  const [bucket, setBucket] = useState<string>(NO_BUCKET)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (target === "new") {
      setName("")
      setIconName("")
      setBucket(NO_BUCKET)
      setError(null)
    } else if (target) {
      setName(target.name)
      setIconName(target.iconName)
      setBucket(target.budgetBucket ?? NO_BUCKET)
      setError(null)
    }
  }, [target])

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= 24 && iconName !== ""

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    const input: CategoryFormInput = {
      name: trimmed,
      iconName,
      budgetBucket: bucket === NO_BUCKET ? null : bucket,
    }
    try {
      if (isEdit) {
        await onUpdate((target as Category).id, input)
      } else {
        await onCreate(input)
      }
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save category — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Renaming moves every transaction filed under the old name to the new one."
              : "Create a category to file transactions under."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Category name"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Budget bucket</span>
            <Select value={bucket} onValueChange={(v) => v && setBucket(v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_BUCKET}>None</SelectItem>
                {/* Defensive: include the currently-saved bucket even if it's
                    since been renamed/deleted out from under this category,
                    so the select never renders blank and stays savable. */}
                {(bucket !== NO_BUCKET && !buckets.includes(bucket)
                  ? [bucket, ...buckets]
                  : buckets
                ).map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            ) : isEdit ? (
              "Save"
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
