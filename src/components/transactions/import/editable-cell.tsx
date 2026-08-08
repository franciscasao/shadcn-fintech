"use client"

import type { KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

// The repo has no inline-cell-editing precedent elsewhere (every other
// mutation goes through a modal dialog — see add-transaction-dialog.tsx),
// so this defines the pattern for the import preview table: an always-live
// controlled input styled to read as plain text until hovered or focused,
// rather than a click-to-enter-edit-mode state machine. That keeps native
// Tab order and screen-reader behavior for free.
//
// `rowIndex`/`colIndex` are the row's position within the *current page* of
// the preview table (it's paginated locally — see import-preview-table.tsx)
// — Enter moves focus to the same column one row down. On the last row of a
// page there's nothing to focus locally, so `onAdvancePastEnd` (when given)
// lets the table turn the page and refocus the same column on the new one,
// instead of Enter silently doing nothing at the boundary.

interface EditableCellProps {
  value: string
  onChange: (value: string) => void
  type?: "text" | "number" | "date"
  step?: string
  min?: number
  align?: "left" | "right"
  invalid?: boolean
  placeholder?: string
  rowIndex: number
  colIndex: number
  onAdvancePastEnd?: () => void
  "aria-label"?: string
}

export function EditableCell({
  value,
  onChange,
  type = "text",
  step,
  min,
  align = "left",
  invalid,
  placeholder,
  rowIndex,
  colIndex,
  onAdvancePastEnd,
  "aria-label": ariaLabel,
}: EditableCellProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.currentTarget.blur()
      return
    }
    if (e.key !== "Enter") return
    e.preventDefault()
    const container = e.currentTarget.closest("[data-editable-grid]")
    const next = container?.querySelector<HTMLElement>(
      `[data-row="${rowIndex + 1}"][data-col="${colIndex}"]`
    )
    if (next) {
      next.focus()
      return
    }
    onAdvancePastEnd?.()
  }

  return (
    <input
      type={type}
      step={step}
      min={min}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      data-row={rowIndex}
      data-col={colIndex}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full min-w-0 rounded-md bg-transparent px-2 py-1 text-sm tabular-nums outline-none transition-colors",
        "hover:bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring",
        align === "right" && "text-right",
        invalid && "text-destructive ring-1 ring-destructive/50"
      )}
    />
  )
}
