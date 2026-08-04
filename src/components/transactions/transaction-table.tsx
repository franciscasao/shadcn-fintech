"use client"

import { AnimatePresence, motion } from "motion/react"
import { EmptyState } from "@/components/empty-state"
import { MerchantLogo } from "@/components/merchant-logo"
import {
  CreditCardIcon,
  FileTextIcon,
  InfoIcon,
  MoreHorizontalIcon,
  StickyNoteIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { FullTransaction } from "@/data/seed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { budgetIconMap } from "@/components/budgets/budget-icons"
import { SortIcon } from "@/components/sort-icon"
import type { SortDir } from "@/hooks/use-table-sort"
import type { TransactionSortKey } from "@/server/queries/transactions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TransactionTableProps {
  transactions: FullTransaction[]
  /** Ids of every row matching the current filters, across all pages — lets
   * "select all" operate on the full filtered set rather than just the
   * visible page. */
  filteredIds: string[]
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  /** Category name -> icon/color, from the managed categories table (see
   * src/server/queries/categories.ts). Missing entries just render as text. */
  categoryMeta: Record<string, { iconName: string; color: string }>
  /** Sort is server-side (see getTransactionsPage) since `transactions` is
   * only the current page — sorting client-side here would just reorder
   * the visible 25 rows instead of the whole filtered set. */
  sortKey: TransactionSortKey | null
  sortDir: SortDir
  onSort: (key: TransactionSortKey) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Math.abs(n))

function statusBadge(status: FullTransaction["status"]) {
  switch (status) {
    case "completed":
      return <Badge variant="default">Completed</Badge>
    case "pending":
      return (
        <Badge variant="outline" className="text-amber-500 dark:text-amber-400">
          Pending
        </Badge>
      )
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
  }
}

export function TransactionTable({
  transactions,
  filteredIds,
  selectedIds,
  setSelectedIds,
  expandedId,
  setExpandedId,
  categoryMeta,
  sortKey,
  sortDir,
  onSort,
}: TransactionTableProps) {
  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))

  const someSelected =
    filteredIds.some((id) => selectedIds.has(id)) && !allSelected

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selectedIds)
      for (const id of filteredIds) next.delete(id)
      setSelectedIds(next)
    } else {
      setSelectedIds(new Set([...selectedIds, ...filteredIds]))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={toggleAll}
                className="size-4 cursor-pointer rounded accent-primary"
              />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => onSort("merchant")}
            >
              Merchant <SortIcon col="merchant" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead className="hidden sm:table-cell">Transaction ID</TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => onSort("amount")}
            >
              Amount <SortIcon col="amount" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="hidden cursor-pointer select-none md:table-cell"
              onClick={() => onSort("date")}
            >
              Date <SortIcon col="date" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead
              className="hidden cursor-pointer select-none lg:table-cell"
              onClick={() => onSort("status")}
            >
              Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <EmptyState variant="filter" className="py-12" />
              </TableCell>
            </TableRow>
          )}

          {transactions.map((tx) => {
            const isExpanded = expandedId === tx.id
            return (
              <TransactionRow
                key={tx.id}
                tx={tx}
                isSelected={selectedIds.has(tx.id)}
                isExpanded={isExpanded}
                onToggleSelect={() => toggleOne(tx.id)}
                onToggleExpand={() =>
                  setExpandedId(isExpanded ? null : tx.id)
                }
                categoryMeta={categoryMeta}
              />
            )
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

function TransactionRow({
  tx,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  categoryMeta,
}: {
  tx: FullTransaction
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
  categoryMeta: Record<string, { iconName: string; color: string }>
}) {
  return (
    <>
      <TableRow
        className={cn(
          "group cursor-pointer",
          isSelected && "bg-muted/50",
          isExpanded && "border-b-0"
        )}
        onClick={onToggleExpand}
      >
        <TableCell className="pl-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="size-4 cursor-pointer rounded accent-primary"
          />
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2.5">
            <MerchantLogo logo={tx.logo} merchant={tx.merchant} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{tx.merchant}</p>
              <Badge variant="secondary" className="mt-0.5 gap-1 text-[10px]">
                {categoryMeta[tx.category] && (
                  <span className={categoryMeta[tx.category].color}>
                    {budgetIconMap[categoryMeta[tx.category].iconName]}
                  </span>
                )}
                {tx.category}
              </Badge>
            </div>
          </div>
        </TableCell>

        <TableCell className="hidden sm:table-cell">
          <span className="font-mono text-xs text-muted-foreground">
            {tx.transactionId}
          </span>
        </TableCell>

        <TableCell className="text-right">
          <span
            className={cn(
              "tabular-nums text-sm font-semibold",
              tx.type === "income" ? "text-emerald-500" : "text-foreground"
            )}
          >
            {tx.type === "income" ? "+" : "-"}
            {fmt(tx.amount)}
          </span>
        </TableCell>

        <TableCell className="hidden md:table-cell">
          <span className="text-sm text-muted-foreground">{tx.date}</span>
        </TableCell>

        <TableCell className="hidden lg:table-cell">
          {statusBadge(tx.status)}
        </TableCell>

        <TableCell>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <tr>
            <td colSpan={7} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-4 border-b bg-muted/30 px-4 py-3 pl-12 text-sm">
                  {tx.merchantInfo && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                      <span>{tx.merchantInfo}</span>
                    </div>
                  )}

                  {tx.cardLast4 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCardIcon className="size-3.5 shrink-0" />
                      <span className="tabular-nums">
                        Paid with card ending ****{tx.cardLast4}
                      </span>
                    </div>
                  )}

                  {tx.notes && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <StickyNoteIcon className="mt-0.5 size-3.5 shrink-0" />
                      <span>{tx.notes}</span>
                    </div>
                  )}

                  <Button variant="ghost" size="xs" className="ml-auto">
                    <FileTextIcon className="size-3.5" />
                    View Receipt
                  </Button>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}
