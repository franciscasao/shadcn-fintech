"use client"

import { useEffect, useState } from "react"
import { PlusIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TransactionFiltersProps {
  search: string
  setSearch: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  typeFilter: string
  setTypeFilter: (v: string) => void
  categories: string[]
  onAddTransaction: () => void
}

export function TransactionFilters({
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  categories,
  onAddTransaction,
}: TransactionFiltersProps) {
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
      <div className="relative w-full sm:min-w-[200px] sm:flex-1">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Category */}
      <Select
        value={categoryFilter}
        onValueChange={(v) => v && setCategoryFilter(v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={statusFilter}
        onValueChange={(v) => v && setStatusFilter(v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

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

      <Button size="sm" className="gap-1" onClick={onAddTransaction}>
        <PlusIcon className="size-4" />
        Add transaction
      </Button>
    </div>
  )
}
