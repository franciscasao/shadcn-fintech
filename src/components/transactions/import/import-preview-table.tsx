"use client"

import { Fragment, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EditableCell } from "@/components/transactions/import/editable-cell"
import { matchesRowFilter, type RowFilter } from "@/components/transactions/import/import-summary"
import type { DraftIssue, DraftTransaction } from "@/lib/import/types"

const PAGE_SIZE = 25

interface ImportPreviewTableProps {
  rows: DraftTransaction[]
  onRowsChange: (rows: DraftTransaction[]) => void
  categoryNames: string[]
  filter: RowFilter
}

function IssueBadge({ issues }: { issues: DraftIssue[] }) {
  if (issues.length === 0) return null
  const hasError = issues.some((i) => i.level === "error")
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant={hasError ? "destructive" : "outline"} className="cursor-help" />}>
        {hasError ? <CircleAlertIcon /> : <TriangleAlertIcon />}
        {issues.length}
      </TooltipTrigger>
      <TooltipContent side="left">
        <div className="flex flex-col gap-0.5">
          {issues.map((issue, i) => (
            <span key={i}>{issue.message}</span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function ImportPreviewTable({ rows, onRowsChange, categoryNames, filter }: ImportPreviewTableProps) {
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const visibleRows = filter ? rows.filter((r) => matchesRowFilter(r, filter)) : rows

  // Adjust state during render rather than in an effect (see
  // https://react.dev/learn/you-might-not-need-an-effect) — switching the
  // filter can leave `page` past the new, smaller result set.
  const [prevFilter, setPrevFilter] = useState(filter)
  if (filter !== prevFilter) {
    setPrevFilter(filter)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages)
  const pageRows = visibleRows.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  const allIncluded = rows.length > 0 && rows.every((r) => r.include)
  const someIncluded = rows.some((r) => r.include) && !allIncluded

  function updateRow(draftId: string, patch: Partial<DraftTransaction>) {
    onRowsChange(rows.map((r) => (r.draftId === draftId ? { ...r, ...patch } : r)))
  }

  function removeRow(draftId: string) {
    onRowsChange(rows.filter((r) => r.draftId !== draftId))
  }

  function toggleAllIncluded() {
    const next = !allIncluded
    onRowsChange(rows.map((r) => ({ ...r, include: next })))
  }

  function toggleExpanded(draftId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(draftId)) next.delete(draftId)
      else next.add(draftId)
      return next
    })
  }

  function goToNextPageAndFocus(colIndex: number) {
    if (clampedPage >= totalPages) return
    setPage(clampedPage + 1)
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-editable-grid] [data-row="0"][data-col="${colIndex}"]`
      )
      el?.focus()
    })
  }

  const includedCount = rows.filter((r) => r.include).length
  const excludedDuplicates = rows.filter((r) => r.duplicateOf && !r.include).length
  const needsAttention = rows.filter((r) => r.include && r.issues.some((i) => i.level === "error")).length

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <div data-editable-grid className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <div className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card">
                  <TableHead className="w-8 pl-3" />
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allIncluded}
                      indeterminate={someIncluded}
                      onCheckedChange={toggleAllIncluded}
                      aria-label="Include all rows"
                    />
                  </TableHead>
                  <TableHead className="min-w-32">Date</TableHead>
                  <TableHead className="min-w-48">Merchant</TableHead>
                  <TableHead className="min-w-40">Category</TableHead>
                  <TableHead className="min-w-32 text-right">Amount</TableHead>
                  <TableHead className="w-16">Issues</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row, i) => {
                  const isExpanded = expanded.has(row.draftId)
                  const isLastOnPage = i === pageRows.length - 1
                  return (
                    <Fragment key={row.draftId}>
                      <TableRow className={cn(!row.include && "opacity-50")}>
                        <TableCell className="pl-3">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(row.draftId)}
                            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={isExpanded ? "Hide source" : "Show source"}
                            aria-expanded={isExpanded}
                          >
                            <ChevronRightIcon className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")} />
                          </button>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={row.include}
                            onCheckedChange={(checked) => updateRow(row.draftId, { include: checked })}
                            aria-label={row.include ? "Exclude row" : "Include row"}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <EditableCell
                            type="date"
                            value={row.date}
                            onChange={(v) => updateRow(row.draftId, { date: v })}
                            rowIndex={i}
                            colIndex={0}
                            invalid={!row.date}
                            onAdvancePastEnd={isLastOnPage ? () => goToNextPageAndFocus(0) : undefined}
                            aria-label="Date"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <EditableCell
                            value={row.merchant}
                            onChange={(v) => updateRow(row.draftId, { merchant: v })}
                            rowIndex={i}
                            colIndex={1}
                            invalid={!row.merchant.trim()}
                            placeholder="Merchant"
                            onAdvancePastEnd={isLastOnPage ? () => goToNextPageAndFocus(1) : undefined}
                            aria-label="Merchant"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Select
                            value={row.category || undefined}
                            onValueChange={(v) => v && updateRow(row.draftId, { category: v })}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-full border-transparent bg-transparent hover:bg-muted/50",
                                !row.category && "text-destructive"
                              )}
                            >
                              <SelectValue placeholder="Choose…" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryNames.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.draftId, { type: row.type === "expense" ? "income" : "expense" })
                              }
                              title={
                                row.type === "expense"
                                  ? "Expense — click to mark as income"
                                  : "Income — click to mark as expense"
                              }
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                row.type === "expense"
                                  ? "bg-rose-500/10 text-rose-500"
                                  : "bg-emerald-500/10 text-emerald-500"
                              )}
                            >
                              {row.type === "expense" ? "−" : "+"}
                            </button>
                            <EditableCell
                              type="number"
                              step="0.01"
                              min={0}
                              value={String(row.amount)}
                              onChange={(v) => updateRow(row.draftId, { amount: Number(v) })}
                              rowIndex={i}
                              colIndex={2}
                              align="right"
                              invalid={!Number.isFinite(row.amount) || row.amount <= 0}
                              onAdvancePastEnd={isLastOnPage ? () => goToNextPageAndFocus(2) : undefined}
                              aria-label="Amount"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <IssueBadge issues={row.issues} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeRow(row.draftId)}
                            aria-label="Remove row"
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={7} className="py-2 pr-4">
                            <div className="flex flex-col gap-1.5">
                              <div>
                                <p className="text-[0.7rem] tracking-wide text-muted-foreground uppercase">
                                  Read from statement
                                </p>
                                <p className="font-mono text-xs text-foreground">{row.sourceLine || "—"}</p>
                              </div>
                              {row.duplicateOf && (
                                <p className="text-xs text-muted-foreground">
                                  {row.duplicateOf.exact ? "Exact match" : "Likely match"} against an existing
                                  transaction already in the ledger.
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">
            Import <span className="tabular-nums text-foreground">{includedCount}</span> of{" "}
            <span className="tabular-nums text-foreground">{rows.length}</span>
            {excludedDuplicates > 0 && ` · ${excludedDuplicates} duplicate${excludedDuplicates === 1 ? "" : "s"} excluded`}
            {needsAttention > 0 && ` · ${needsAttention} row${needsAttention === 1 ? "" : "s"} need attention`}
            {filter && ` · showing ${visibleRows.length} filtered`}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={clampedPage <= 1}
                onClick={() => setPage(clampedPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="px-1 text-xs tabular-nums text-muted-foreground">
                Page {clampedPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={clampedPage >= totalPages}
                onClick={() => setPage(clampedPage + 1)}
                aria-label="Next page"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
