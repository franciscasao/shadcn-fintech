"use client"

import { useEffect, useState } from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const fmt = (n: number) => `₱${n.toLocaleString("en-PH")}`

interface AmountRangeFilterProps {
  /** Filters on abs(amount) — see buildWhere in the query module. Not a
   * Slider: the values span ₱2.99–₱8,500 with heavy right skew, which a
   * linear two-thumb slider handles badly at the low end. */
  amountMin: number | undefined
  amountMax: number | undefined
  onChange: (min: string | undefined, max: string | undefined) => void
  triggerClassName?: string
}

export function AmountRangeFilter({
  amountMin,
  amountMax,
  onChange,
  triggerClassName,
}: AmountRangeFilterProps) {
  const [localMin, setLocalMin] = useState(amountMin != null ? String(amountMin) : "")
  const [localMax, setLocalMax] = useState(amountMax != null ? String(amountMax) : "")
  const debouncedMin = useDebouncedValue(localMin, 400)
  const debouncedMax = useDebouncedValue(localMax, 400)

  // Keep local state in sync when the filter is cleared from elsewhere
  // (e.g. Clear all / Reset filters) — same pattern as the search box in
  // transaction-filters-bar.tsx.
  useEffect(() => {
    setLocalMin(amountMin != null ? String(amountMin) : "")
  }, [amountMin])
  useEffect(() => {
    setLocalMax(amountMax != null ? String(amountMax) : "")
  }, [amountMax])

  useEffect(() => {
    const currentMin = amountMin != null ? String(amountMin) : ""
    const currentMax = amountMax != null ? String(amountMax) : ""
    if (debouncedMin !== currentMin || debouncedMax !== currentMax) {
      onChange(debouncedMin || undefined, debouncedMax || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin, debouncedMax])

  function label() {
    if (amountMin != null && amountMax != null) return `${fmt(amountMin)} – ${fmt(amountMax)}`
    if (amountMin != null) return `≥ ${fmt(amountMin)}`
    if (amountMax != null) return `≤ ${fmt(amountMax)}`
    return "Amount"
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 font-normal", triggerClassName)}
          />
        }
      >
        {label()}
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex items-center gap-2">
          <InputGroup>
            <InputGroupAddon>₱</InputGroupAddon>
            <InputGroupInput
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="Min"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
            />
          </InputGroup>
          <span className="text-muted-foreground">–</span>
          <InputGroup>
            <InputGroupAddon>₱</InputGroupAddon>
            <InputGroupInput
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="Max"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
            />
          </InputGroup>
        </div>
        {(localMin || localMax) && (
          <Button
            variant="ghost"
            size="xs"
            className="mt-2 w-full text-muted-foreground"
            onClick={() => {
              setLocalMin("")
              setLocalMax("")
              onChange(undefined, undefined)
            }}
          >
            <XIcon className="size-3" />
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
