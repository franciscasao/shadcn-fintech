"use client"

import { XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface ActiveChip {
  key: string
  label: string
  hint?: string
  onClear: () => void
}

interface ActiveFilterChipsProps {
  chips: ActiveChip[]
  onClearAll: () => void
}

/** One dismissible Badge per active filter, plus a trailing "Clear all" —
 * generalizes the bucket-filter chip that used to live inline in
 * transactions-page-client.tsx (same visual treatment, now driven by an
 * arbitrary list so every filter gets one, not just the budget deep link). */
export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="w-fit gap-1.5 py-1 pl-2.5 pr-1.5 text-xs font-normal"
        >
          {chip.label}
          {chip.hint && <span className="text-muted-foreground">· {chip.hint}</span>}
          <button
            type="button"
            onClick={chip.onClear}
            className="rounded-full p-0.5 hover:bg-foreground/10"
            aria-label={`Clear ${chip.label} filter`}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  )
}
