"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { TransactionFilters, TransactionPage } from "@/server/queries/transactions"
import { TransactionSummary } from "@/components/transactions/transaction-summary"
import { TransactionFilters as TransactionFiltersBar } from "@/components/transactions/transaction-filters"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { TransactionPagination } from "@/components/transactions/transaction-pagination"
import { TransactionActions } from "@/components/transactions/transaction-actions"
import { cn } from "@/lib/utils"

export function TransactionsPageClient({
  transactionsPage,
  categories,
  filters,
}: {
  transactionsPage: TransactionPage
  categories: string[]
  filters: TransactionFilters
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      />

      <div className={cn("transition-opacity", isPending && "opacity-60")}>
        <TransactionTable
          transactions={transactionsPage.rows}
          filteredIds={transactionsPage.filteredIds}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
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
    </div>
  )
}
