"use client"

import type { ReactNode } from "react"
import { SlidersHorizontalIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import type { BankAccount, Category, CardData } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FacetedFilter } from "@/components/faceted-filter"
import { AmountRangeFilter } from "@/components/transactions/filters/amount-range-filter"

const STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
] as const

interface MoreFiltersProps {
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

  onReset: () => void
}

function statusLabel(selected: string[]): ReactNode {
  if (selected.length === 0) return "Status"
  if (selected.length === 1) {
    return STATUS_OPTIONS.find((s) => s.value === selected[0])?.label ?? "Status"
  }
  return `${selected.length} statuses`
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/** Category / Status / Card / Account / Amount, tucked behind one popover
 * (a bottom Sheet on mobile) so the primary control row — search, date
 * range, type — stays on one line. See transaction-filters-bar.tsx for the
 * controls that stay inline. */
export function MoreFilters({
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
  onReset,
}: MoreFiltersProps) {
  const isMobile = useIsMobile()

  const activeCount =
    selectedCategories.length +
    selectedStatuses.length +
    selectedCardIds.length +
    selectedAccountIds.length +
    (amountMin != null || amountMax != null ? 1 : 0)

  const triggerContent = (
    <>
      <SlidersHorizontalIcon className="size-3.5" />
      Filters
      {activeCount > 0 && (
        <Badge variant="secondary" className="rounded-md px-1.5 font-normal tabular-nums">
          {activeCount}
        </Badge>
      )}
    </>
  )
  const triggerButton = <Button variant="outline" size="sm" className="h-8 gap-1.5" />

  const body = (
    <div className="flex flex-col gap-3">
      <Field label="Category">
        <FacetedFilter
          title="Category"
          className="w-full justify-start border-solid"
          searchable={categories.length > 8}
          options={categories.map((c) => ({
            value: c.name,
            label: c.name,
            count: c.transactionCount,
          }))}
          selected={selectedCategories}
          onChange={onCategoriesChange}
        />
      </Field>

      <Field label="Status">
        <Select multiple value={selectedStatuses} onValueChange={onStatusesChange}>
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="Status">{() => statusLabel(selectedStatuses)}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Card">
        <FacetedFilter
          title="Card"
          className="w-full justify-start border-solid"
          options={[
            { value: "none", label: "No card" },
            ...cards.map((c) => ({ value: c.id, label: `${c.name} •••• ${c.last4}` })),
          ]}
          selected={selectedCardIds}
          onChange={onCardIdsChange}
        />
      </Field>

      <Field label="Account">
        <FacetedFilter
          title="Account"
          className="w-full justify-start border-solid"
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          selected={selectedAccountIds}
          onChange={onAccountIdsChange}
        />
      </Field>

      <Field label="Amount">
        <AmountRangeFilter
          amountMin={amountMin}
          amountMax={amountMax}
          onChange={onAmountChange}
          triggerClassName="w-full justify-start border-solid"
        />
      </Field>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onReset}>
          Reset filters
        </Button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger render={triggerButton}>{triggerContent}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription className="sr-only">
              Narrow transactions by category, status, card, account, or amount.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{body}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover>
      <PopoverTrigger render={triggerButton}>{triggerContent}</PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        {body}
      </PopoverContent>
    </Popover>
  )
}
