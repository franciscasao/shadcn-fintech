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
import type { Category } from "@/lib/types"

interface DeleteCategoryDialogProps {
  category: Category | null
  categories: Category[]
  onOpenChange: (open: boolean) => void
  onDelete: (id: string, reassignToId: string) => Promise<void>
}

export function DeleteCategoryDialog({
  category,
  categories,
  onOpenChange,
  onDelete,
}: DeleteCategoryDialogProps) {
  const otherCategories = categories.filter((c) => c.id !== category?.id)

  const [reassignTo, setReassignTo] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReassignTo(otherCategories[0]?.id ?? "")
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const canSubmit = category !== null && reassignTo !== ""

  async function handleSubmit() {
    if (!category || !canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onDelete(category.id, reassignTo)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete category — try again")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={category !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete category</DialogTitle>
          <DialogDescription>
            {category && category.transactionCount > 0
              ? `${category.transactionCount} transaction${category.transactionCount === 1 ? "" : "s"} use "${category.name}". Choose where they should move.`
              : `No transactions currently use "${category?.name}".`}
          </DialogDescription>
        </DialogHeader>

        {otherCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This is your only category — create another one before deleting this one.
          </p>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Move transactions to</span>
            <Select value={reassignTo} onValueChange={(v) => v && setReassignTo(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {otherCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
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
            disabled={!canSubmit || submitting || otherCategories.length === 0}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete & reassign"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
