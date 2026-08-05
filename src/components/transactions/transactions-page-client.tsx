"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type {
  TransactionFilters,
  TransactionPage,
  TransactionSort,
  TransactionSortKey,
} from "@/server/queries/transactions"
import type { NewTransactionInput } from "@/server/mutations/transactions"
import type { BankAccount, CardData } from "@/lib/types"
import { TransactionSummary } from "@/components/transactions/transaction-summary"
import { TransactionFilters as TransactionFiltersBar } from "@/components/transactions/transaction-filters"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { TransactionPagination } from "@/components/transactions/transaction-pagination"
import { TransactionActions } from "@/components/transactions/transaction-actions"
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog"
import { cn } from "@/lib/utils"

export function TransactionsPageClient({
  transactionsPage,
  categories,
  categoryMeta,
  accounts,
  cards,
  defaultDate,
  filters,
  sort,
}: {
  transactionsPage: TransactionPage
  categories: string[]
  categoryMeta: Record<string, { iconName: string; color: string }>
  accounts: BankAccount[]
  cards: CardData[]
  defaultDate: string
  filters: TransactionFilters
  sort: TransactionSort | undefined
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // An expanded row can scroll off the page when the page number changes —
  // reset it during render (React's "adjusting state on prop change"
  // pattern) rather than in an effect, to avoid an extra cascading render.
  const [lastSeenPage, setLastSeenPage] = useState(transactionsPage.page)
  if (transactionsPage.page !== lastSeenPage) {
    setLastSeenPage(transactionsPage.page)
    setExpandedId(null)
  }

  function setParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      const isDefault =
        !value ||
        value === "all" ||
        (key === "page" && value === "1") ||
        (key === "size" && value === "25")
      if (isDefault) next.delete(key)
      else next.set(key, value)
    }
    // Any filter change resets paging — otherwise you can filter down to a
    // handful of results while sitting on page 7 and see an empty table.
    if (!("page" in patch)) next.delete("page")

    const query = next.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  // Cycles a column through asc -> desc -> off, same as every other sortable
  // table in the app — but pushed into the `sort`/`dir` searchParams since
  // this table's rows are server-paginated (see getTransactionsPage).
  function handleSort(key: TransactionSortKey) {
    if (sort?.key !== key) {
      setParams({ sort: key, dir: "asc" })
    } else if (sort.dir === "asc") {
      setParams({ sort: key, dir: "desc" })
    } else {
      setParams({ sort: undefined, dir: undefined })
    }
  }

  async function handleExport() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const res = await fetch("/api/transactions/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) return
    const selected: Array<{
      merchant: string
      transactionId: string
      amount: number
      date: string
      status: string
      type: string
    }> = await res.json()

    const header = "Merchant,Transaction ID,Amount,Date,Status,Type"
    const rows = selected.map(
      (t) =>
        `"${t.merchant}","${t.transactionId}",${t.amount},"${t.date}","${t.status}","${t.type}"`
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "transactions.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAddTransaction(input: NewTransactionInput) {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Couldn't add transaction")
    }
    router.refresh()
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        selectedIds.size > 0 && "pb-16"
      )}
    >
      <TransactionSummary stats={transactionsPage.stats} />

      <TransactionFiltersBar
        search={filters.search ?? ""}
        setSearch={(v) => setParams({ q: v })}
        categoryFilter={filters.category ?? "all"}
        setCategoryFilter={(v) => setParams({ category: v })}
        statusFilter={filters.status ?? "all"}
        setStatusFilter={(v) => setParams({ status: v })}
        typeFilter={filters.type ?? "all"}
        setTypeFilter={(v) => setParams({ type: v })}
        categories={categories}
        onAddTransaction={() => setAddOpen(true)}
      />

      <div className={cn("transition-opacity", isPending && "opacity-60")}>
        <TransactionTable
          transactions={transactionsPage.rows}
          filteredIds={transactionsPage.filteredIds}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          categoryMeta={categoryMeta}
          sortKey={sort?.key ?? "date"}
          sortDir={sort?.dir ?? "desc"}
          onSort={handleSort}
        />

        <TransactionPagination
          page={transactionsPage.page}
          pageSize={transactionsPage.pageSize}
          totalPages={transactionsPage.totalPages}
          totalCount={transactionsPage.stats.count}
          onPageChange={(page) => setParams({ page: String(page) })}
          onPageSizeChange={(size) => setParams({ size: String(size), page: "1" })}
        />
      </div>

      <TransactionActions
        selectedCount={selectedIds.size}
        onExport={handleExport}
        onClear={() => setSelectedIds(new Set())}
      />

      <AddTransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        accounts={accounts}
        cards={cards}
        defaultDate={defaultDate}
        onAdd={handleAddTransaction}
      />
    </div>
  )
}
