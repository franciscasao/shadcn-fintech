"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailySpending } from "@/lib/types"
import { cn } from "@/lib/utils"
import { today, todayISO } from "@/lib/today"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_TITLE = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })

export function SpendingCalendar({ dailySpending }: { dailySpending: DailySpending[] }) {
  const { weeks, maxAmount, title, todayIso } = useMemo(() => {
    const map = new Map(dailySpending.map((d) => [d.date, d.amount]))
    // dailySpending covers the current calendar month, day 1 through the
    // last day — see getDailySpending in @/server/queries/analytics.
    const now = today()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const startPad = firstDay.getDay() // day of week offset
    const daysInMonth = dailySpending.length
    const cells: { day: number | null; amount: number; date: string }[] = []

    for (let i = 0; i < startPad; i++) cells.push({ day: null, amount: 0, date: "" })
    let max = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const date = dailySpending[d - 1]?.date ?? ""
      const amount = map.get(date) ?? 0
      if (amount > max) max = amount
      cells.push({ day: d, amount, date })
    }

    const weeks: typeof cells[] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }
    // Pad last week
    const last = weeks[weeks.length - 1]
    if (last) while (last.length < 7) last.push({ day: null, amount: 0, date: "" })

    return { weeks, maxAmount: max, title: MONTH_TITLE.format(firstDay), todayIso: todayISO() }
  }, [dailySpending])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {title} Spending
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          {DAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        {/* Weeks */}
        <div className="mt-1 grid gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) => {
                if (cell.day === null) {
                  return <div key={ci} />
                }
                const intensity =
                  cell.amount === 0
                    ? 0
                    : Math.min(Math.round((cell.amount / maxAmount) * 4), 4)
                const isToday = cell.date === todayIso
                return (
                  <div
                    key={ci}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg py-1.5 text-center transition-colors",
                      intensity === 0 && "bg-transparent",
                      intensity === 1 && "bg-primary/10",
                      intensity === 2 && "bg-primary/20",
                      intensity === 3 && "bg-primary/35",
                      intensity === 4 && "bg-primary/50",
                      isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                  >
                    <span className="text-[11px] font-medium">{cell.day}</span>
                    {cell.amount > 0 && (
                      <span className="hidden text-[9px] tabular-nums text-muted-foreground sm:inline">
                        ₱{cell.amount}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
