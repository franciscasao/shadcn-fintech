"use client"

import type { ComponentType } from "react"
import { ArrowUpDownIcon, CheckCircle2Icon, CircleAlertIcon, CopyIcon, RotateCcwIcon, TagIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DraftTransaction } from "@/lib/import/types"

// Replaces the old toolbar (a bare "Flip income/expense" button plus a
// write-only "set category" select) and the table's footer sentence. Same
// counts as before, but each one is now a filter you can click into instead
// of a number you have to take on faith.

export type RowFilter = "included" | "needsCategory" | "duplicates" | "issues" | null

export function matchesRowFilter(row: DraftTransaction, filter: RowFilter): boolean {
  switch (filter) {
    case "included":
      return row.include
    case "needsCategory":
      return row.include && !row.category
    case "duplicates":
      return !!row.duplicateOf && !row.include
    case "issues":
      return row.include && row.issues.some((i) => i.level === "error")
    case null:
    default:
      return true
  }
}

interface ImportSummaryProps {
  rows: DraftTransaction[]
  categoryNames: string[]
  filter: RowFilter
  onFilterChange: (filter: RowFilter) => void
  onFlipAll: () => void
  onBulkCategory: (category: string) => void
  autoFlipped: boolean
}

function Chip({
  icon: Icon,
  label,
  count,
  active,
  tone = "default",
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  count: number
  active: boolean
  tone?: "default" | "destructive"
  onClick: () => void
}) {
  const hot = tone === "destructive" && count > 0
  return (
    <button
      type="button"
      disabled={count === 0}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ring-1 transition-colors",
        count === 0 && "opacity-40",
        active
          ? hot
            ? "bg-destructive/10 ring-destructive/40"
            : "bg-primary/10 ring-primary/40"
          : "bg-card ring-foreground/10 hover:bg-muted/50"
      )}
    >
      <Icon className={cn("size-3", hot ? "text-destructive" : "text-muted-foreground")} />
      <span className={cn("tabular-nums font-semibold", hot ? "text-destructive" : "text-foreground")}>{count}</span>
      <span className="text-muted-foreground">{label}</span>
    </button>
  )
}

export function ImportSummary({
  rows,
  categoryNames,
  filter,
  onFilterChange,
  onFlipAll,
  onBulkCategory,
  autoFlipped,
}: ImportSummaryProps) {
  const included = rows.filter((r) => r.include)
  const needsCategoryCount = included.filter((r) => !r.category).length
  const duplicatesCount = rows.filter((r) => r.duplicateOf && !r.include).length
  const issuesCount = included.filter((r) => r.issues.some((i) => i.level === "error")).length

  function toggle(next: RowFilter) {
    onFilterChange(filter === next ? null : next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            icon={CheckCircle2Icon}
            label="selected"
            count={included.length}
            active={filter === "included"}
            onClick={() => toggle("included")}
          />
          <Chip
            icon={TagIcon}
            label="need a category"
            count={needsCategoryCount}
            active={filter === "needsCategory"}
            onClick={() => toggle("needsCategory")}
          />
          <Chip
            icon={CopyIcon}
            label="duplicates"
            count={duplicatesCount}
            active={filter === "duplicates"}
            onClick={() => toggle("duplicates")}
          />
          <Chip
            icon={CircleAlertIcon}
            label="need attention"
            count={issuesCount}
            active={filter === "issues"}
            tone="destructive"
            onClick={() => toggle("issues")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onFlipAll}>
            <ArrowUpDownIcon className="size-3.5" />
            Flip income/expense
          </Button>
          <Select value="" onValueChange={(v) => v && onBulkCategory(v)} disabled={needsCategoryCount === 0}>
            <SelectTrigger size="sm" className="w-56">
              <SelectValue
                placeholder={
                  needsCategoryCount === 0
                    ? "All rows categorized"
                    : `Set category for ${needsCategoryCount} row${needsCategoryCount === 1 ? "" : "s"}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categoryNames.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {autoFlipped && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <RotateCcwIcon className="size-3.5 shrink-0" />
          <span>
            Signs flipped automatically — credit-card statements print charges as positive amounts, the opposite of a
            deposit account.
          </span>
          <button
            type="button"
            onClick={onFlipAll}
            className="ml-auto shrink-0 font-medium text-foreground underline underline-offset-2"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
