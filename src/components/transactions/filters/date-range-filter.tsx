"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRangePreset } from "@/server/queries/transactions"

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "mtd", label: "This month" },
  { id: "lastmonth", label: "Last month" },
  { id: "ytd", label: "Year to date" },
  { id: "all", label: "All time" },
]

function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

interface DateRangeFilterProps {
  /** Resolved bounds from the server — used only to render the trigger
   * label; the actual filtering already happened server-side. */
  dateFrom: string | undefined
  dateTo: string | undefined
  /** Which input produced dateFrom/dateTo, for picking the right label —
   * see the precedence comment on resolveDateBounds in the query module. */
  datePreset: DateRangePreset | undefined
  month: string | undefined
  onPresetChange: (preset: DateRangePreset) => void
  onCustomRangeChange: (from: string | undefined, to: string | undefined) => void
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  datePreset,
  month,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)

  const initialRange: DateRange | undefined =
    !datePreset && !month && (dateFrom || dateTo)
      ? { from: dateFrom ? parseISO(dateFrom) : undefined, to: dateTo ? parseISO(dateTo) : undefined }
      : undefined
  const [range, setRange] = useState<DateRange | undefined>(initialRange)

  function label(): string {
    if (datePreset && datePreset !== "all") {
      return PRESETS.find((p) => p.id === datePreset)?.label ?? "Date range"
    }
    if (month) {
      return format(parseISO(`${month}-01`), "MMMM yyyy")
    }
    if (dateFrom || dateTo) {
      if (dateFrom && dateTo) {
        return `${format(parseISO(dateFrom), "MMM d")} – ${format(parseISO(dateTo), "MMM d, yyyy")}`
      }
      return dateFrom
        ? `From ${format(parseISO(dateFrom), "MMM d, yyyy")}`
        : `Until ${format(parseISO(dateTo!), "MMM d, yyyy")}`
    }
    return "All time"
  }

  function handlePreset(preset: DateRangePreset) {
    setRange(undefined)
    onPresetChange(preset)
    setOpen(false)
  }

  function handleCalendarSelect(next: DateRange | undefined) {
    setRange(next)
    if (next?.from && next?.to) {
      onCustomRangeChange(toISO(next.from), toISO(next.to))
      setOpen(false)
    }
  }

  const activePreset = !month && (dateFrom || dateTo) && !datePreset ? undefined : datePreset

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal" />}
      >
        <CalendarIcon className="size-3.5 text-muted-foreground" />
        {label()}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="flex shrink-0 flex-row gap-0.5 overflow-x-auto p-2 sm:flex-col sm:overflow-visible sm:border-r">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="ghost"
                size="sm"
                onClick={() => handlePreset(preset.id)}
                className={cn(
                  "justify-start whitespace-nowrap font-normal",
                  activePreset === preset.id && "bg-muted text-foreground"
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
