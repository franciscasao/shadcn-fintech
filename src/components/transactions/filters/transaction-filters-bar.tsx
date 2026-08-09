"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PlusIcon, SearchIcon, UploadIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import type { BankAccount, Category, CardData } from "@/lib/types"
import type { DateRangePreset } from "@/server/queries/transactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateRangeFilter } from "@/components/transactions/filters/date-range-filter"
import { MoreFilters } from "@/components/transactions/filters/more-filters"

interface TransactionFiltersBarProps {
  search: string
  setSearch: (v: string) => void

  dateFrom: string | undefined
  dateTo: string | undefined
  datePreset: DateRangePreset | undefined
  month: string | undefined
  onPresetChange: (preset: DateRangePreset) => void
  onCustomRangeChange: (from: string | undefined, to: string | undefined) => void

  typeFilter: string
  setTypeFilter: (v: string) => void

  categories: Category[]
  selectedCategories: string[]
  onCategoriesChange: (v: string[]) => void

  selectedStatuses: string[]
  onStatusesChange: (v: string[]) => void

  cards: CardData[]
  selectedCardIds: string[]
  onCardIdsChange: (v: string[]) => void

  accounts: BankAccount[]
  selectedAccountIds: string[]
  onAccountIdsChange: (v: string[]) => void

  amountMin: number | undefined
  amountMax: number | undefined
  onAmountChange: (min: string | undefined, max: string | undefined) => void
  onResetMoreFilters: () => void

  onAddTransaction: () => void
}

/** Row 1 of the transactions filter UI: search, date range, and the type
 * toggle stay inline; category/status/card/account/amount live behind
 * MoreFilters so this row holds at one line down to ~640px. Active values
 * across all of these render as chips underneath — see
 * active-filter-chips.tsx, wired up in transactions-page-client.tsx. */
export function TransactionFiltersBar({
  search,
  setSearch,
  dateFrom,
  dateTo,
  datePreset,
  month,
  onPresetChange,
  onCustomRangeChange,
  typeFilter,
  setTypeFilter,
  categories,
  selectedCategories,
  onCategoriesChange,
  selectedStatuses,
  onStatusesChange,
  cards,
  selectedCardIds,
  onCardIdsChange,
  accounts,
  selectedAccountIds,
  onAccountIdsChange,
  amountMin,
  amountMax,
  onAmountChange,
  onResetMoreFilters,
  onAddTransaction,
}: TransactionFiltersBarProps) {
  const typeOptions = ["all", "income", "expense"] as const

  // Local state keeps the input's caret responsive on every keystroke; the
  // debounced value is what actually drives the (server-round-trip) search,
  // committed to the URL by the parent.
  const [localSearch, setLocalSearch] = useState(search)
  const debouncedSearch = useDebouncedValue(localSearch, 300)

  useEffect(() => {
    setLocalSearch(search)
  }, [search])

  useEffect(() => {
    if (debouncedSearch !== search) setSearch(debouncedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative w-full sm:min-w-[180px] sm:flex-1">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        datePreset={datePreset}
        month={month}
        onPresetChange={onPresetChange}
        onCustomRangeChange={onCustomRangeChange}
      />

      {/* Type Toggle */}
      <div className="flex items-center rounded-lg border border-border p-0.5">
        {typeOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setTypeFilter(opt)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
              typeFilter === opt
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt}
          </button>
        ))}
      </div>

      <MoreFilters
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={onCategoriesChange}
        selectedStatuses={selectedStatuses}
        onStatusesChange={onStatusesChange}
        cards={cards}
        selectedCardIds={selectedCardIds}
        onCardIdsChange={onCardIdsChange}
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
        onAccountIdsChange={onAccountIdsChange}
        amountMin={amountMin}
        amountMax={amountMax}
        onAmountChange={onAmountChange}
        onReset={onResetMoreFilters}
      />

      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        nativeButton={false}
        render={<Link href="/transactions/import" />}
      >
        <UploadIcon className="size-4" />
        Import
      </Button>

      <Button size="sm" className="gap-1" onClick={onAddTransaction}>
        <PlusIcon className="size-4" />
        Add transaction
      </Button>
    </div>
  )
}
