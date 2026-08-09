"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"

import type {
  DateRangePreset,
  TransactionFilters,
  TransactionPage,
  TransactionSort,
  TransactionSortKey,
} from "@/server/queries/transactions"
import type {
  DeleteTransactionsResult,
  NewTransactionInput,
} from "@/server/mutations/transactions"
import type { BankAccount, Category, CardData, FullTransaction } from "@/lib/types"
import { TransactionSummary } from "@/components/transactions/transaction-summary"
import {
  ActiveFilterChips,
  type ActiveChip,
} from "@/components/transactions/filters/active-filter-chips"
import { TransactionFiltersBar } from "@/components/transactions/filters/transaction-filters-bar"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { TransactionPagination } from "@/components/transactions/transaction-pagination"
import { TransactionActions } from "@/components/transactions/transaction-actions"
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog"
import { DeleteTransactionsDialog } from "@/components/transactions/delete-transactions-dialog"
import { cn } from "@/lib/utils"

// Every filter param this page reads/writes — clearAllFilters() wipes
// exactly these, leaving sort/dir/size untouched.
const FILTER_KEYS = [
  "q",
  "category",
  "status",
  "type",
  "range",
  "from",
  "to",
  "min",
  "max",
  "card",
  "account",
  "bucket",
  "month",
] as const

const PRESET_LABELS: Record<DateRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  mtd: "This month",
  lastmonth: "Last month",
  ytd: "Year to date",
  all: "All time",
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
}

const fmtAmount = (n: number) => `₱${n.toLocaleString("en-PH")}`

export function TransactionsPageClient({
  transactionsPage,
  categories,
  categoryNames,
  categoryMeta,
  accounts,
  cards,
  filters,
  sort,
}: {
  transactionsPage: TransactionPage
  categories: Category[]
  categoryNames: string[]
  categoryMeta: Record<string, { iconName: string; color: string }>
  accounts: BankAccount[]
  cards: CardData[]
  filters: TransactionFilters
  sort: TransactionSort | undefined
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null)

  // An expanded row can scroll off the page when the page number changes —
  // reset it during render (React's "adjusting state on prop change"
  // pattern) rather than in an effect, to avoid an extra cascading render.
  const [lastSeenPage, setLastSeenPage] = useState(transactionsPage.page)
  if (transactionsPage.page !== lastSeenPage) {
    setLastSeenPage(transactionsPage.page)
    setExpandedId(null)
  }

  // setParams can be called twice in quick succession by two independently
  // debounced writers (search at 300ms, amount at 400ms). Building `next`
  // from the `searchParams` hook value would be a stale-snapshot race: that
  // value only updates once the resulting RSC re-render commits, which lags
  // behind rapid calls. Reading window.location.search instead is always
  // current — Next's router updates the address bar synchronously on
  // replace(), well ahead of the async re-render — so back-to-back calls
  // correctly build on top of each other instead of one clobbering the other.
  function setParams(patch: Record<string, string | string[] | undefined>) {
    const next = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(patch)) {
      if (Array.isArray(value)) {
        next.delete(key)
        for (const v of value) {
          if (v) next.append(key, v)
        }
        continue
      }
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

  function clearAllFilters() {
    setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])))
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

  async function handleDeleteTransactions(ids: string[]): Promise<DeleteTransactionsResult> {
    const res = await fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Couldn't delete transactions")
    }
    const result: DeleteTransactionsResult = await res.json()
    // Drop the deleted ids from the selection so the bulk bar doesn't keep
    // showing a stale count for rows that no longer exist.
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
    router.refresh()
    return result
  }

  function handleDeleteTransaction(tx: FullTransaction) {
    setDeleteTargetIds([tx.id])
  }

  // ── Derived filter state (URL/server shape -> UI shape) ──────────────────
  const selectedCategories = filters.categories ?? []
  const selectedStatuses = filters.statuses ?? []
  const selectedCardIds = (filters.cardIds ?? []).map((c) => String(c))
  const selectedAccountIds = (filters.accountIds ?? []).map((a) => String(a))

  // ── Active filter chips ───────────────────────────────────────────────────
  const chips: ActiveChip[] = []

  if (filters.search) {
    chips.push({
      key: "q",
      label: `"${filters.search}"`,
      onClear: () => setParams({ q: undefined }),
    })
  }

  if (filters.bucket) {
    chips.push({
      key: "bucket",
      label: filters.bucket,
      hint: filters.month ? format(parseISO(`${filters.month}-01`), "MMMM yyyy") : undefined,
      onClear: () => setParams({ bucket: undefined, month: undefined, type: undefined }),
    })
  } else if (filters.datePreset && filters.datePreset !== "all") {
    chips.push({
      key: "date",
      label: PRESET_LABELS[filters.datePreset],
      onClear: () => setParams({ range: undefined }),
    })
  } else if (filters.month) {
    chips.push({
      key: "date",
      label: format(parseISO(`${filters.month}-01`), "MMMM yyyy"),
      onClear: () => setParams({ month: undefined }),
    })
  } else if (filters.dateFrom || filters.dateTo) {
    const label =
      filters.dateFrom && filters.dateTo
        ? `${format(parseISO(filters.dateFrom), "MMM d")} – ${format(parseISO(filters.dateTo), "MMM d, yyyy")}`
        : filters.dateFrom
          ? `From ${format(parseISO(filters.dateFrom), "MMM d, yyyy")}`
          : `Until ${format(parseISO(filters.dateTo!), "MMM d, yyyy")}`
    chips.push({
      key: "date",
      label,
      onClear: () => setParams({ from: undefined, to: undefined }),
    })
  }

  for (const cat of selectedCategories) {
    chips.push({
      key: `category-${cat}`,
      label: cat,
      onClear: () => setParams({ category: selectedCategories.filter((c) => c !== cat) }),
    })
  }

  for (const status of selectedStatuses) {
    chips.push({
      key: `status-${status}`,
      label: STATUS_LABELS[status] ?? status,
      onClear: () => setParams({ status: selectedStatuses.filter((s) => s !== status) }),
    })
  }

  for (const cardId of selectedCardIds) {
    const label =
      cardId === "none" ? "No card" : (cards.find((c) => c.id === cardId)?.name ?? `Card ${cardId}`)
    chips.push({
      key: `card-${cardId}`,
      label,
      onClear: () => setParams({ card: selectedCardIds.filter((c) => c !== cardId) }),
    })
  }

  for (const accountId of selectedAccountIds) {
    const label = accounts.find((a) => a.id === accountId)?.name ?? `Account ${accountId}`
    chips.push({
      key: `account-${accountId}`,
      label,
      onClear: () => setParams({ account: selectedAccountIds.filter((a) => a !== accountId) }),
    })
  }

  if (filters.amountMin != null || filters.amountMax != null) {
    const label =
      filters.amountMin != null && filters.amountMax != null
        ? `${fmtAmount(filters.amountMin)} – ${fmtAmount(filters.amountMax)}`
        : filters.amountMin != null
          ? `≥ ${fmtAmount(filters.amountMin)}`
          : `≤ ${fmtAmount(filters.amountMax!)}`
    chips.push({
      key: "amount",
      label,
      onClear: () => setParams({ min: undefined, max: undefined }),
    })
  }

  return (
    <div className={cn("flex flex-col gap-4", selectedIds.size > 0 && "pb-16")}>
      <TransactionSummary stats={transactionsPage.stats} />

      <TransactionFiltersBar
        search={filters.search ?? ""}
        setSearch={(v) => setParams({ q: v })}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        datePreset={filters.datePreset}
        month={filters.month}
        onPresetChange={(preset) =>
          setParams({ range: preset, from: undefined, to: undefined, month: undefined })
        }
        onCustomRangeChange={(from, to) =>
          setParams({ from, to, range: undefined, month: undefined })
        }
        typeFilter={filters.type ?? "all"}
        setTypeFilter={(v) => setParams({ type: v })}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={(v) => setParams({ category: v })}
        selectedStatuses={selectedStatuses}
        onStatusesChange={(v) => setParams({ status: v })}
        cards={cards}
        selectedCardIds={selectedCardIds}
        onCardIdsChange={(v) => setParams({ card: v })}
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
        onAccountIdsChange={(v) => setParams({ account: v })}
        amountMin={filters.amountMin}
        amountMax={filters.amountMax}
        onAmountChange={(min, max) => setParams({ min, max })}
        onResetMoreFilters={() =>
          setParams({ category: [], status: [], card: [], account: [], min: undefined, max: undefined })
        }
        onAddTransaction={() => setAddOpen(true)}
      />

      <ActiveFilterChips chips={chips} onClearAll={clearAllFilters} />

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
          onDelete={handleDeleteTransaction}
          hasActiveFilters={chips.length > 0}
          onClearFilters={clearAllFilters}
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
        onDelete={() => setDeleteTargetIds(Array.from(selectedIds))}
        onClear={() => setSelectedIds(new Set())}
      />

      <AddTransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categoryNames}
        accounts={accounts}
        cards={cards}
        onAdd={handleAddTransaction}
      />

      <DeleteTransactionsDialog
        ids={deleteTargetIds}
        onOpenChange={(open) => !open && setDeleteTargetIds(null)}
        onDelete={handleDeleteTransactions}
      />
    </div>
  )
}
