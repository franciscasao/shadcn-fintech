"use client"

import { useState } from "react"
import Image from "next/image"
import { LineChart, Line } from "recharts"
import { X, Plus } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { watchlistItems, type WatchlistItem } from "@/data/seed"
import { useTableSort } from "@/hooks/use-table-sort"
import { SortIcon } from "@/components/sort-icon"

type SortKey = "symbol" | "name" | "currentPrice" | "dayChange"

export function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>(watchlistItems)

  const { sortKey, sortDir, toggleSort, sorted } = useTableSort<WatchlistItem, SortKey>(
    items,
    (a, b, key) => {
      switch (key) {
        case "symbol":
          return a.symbol.localeCompare(b.symbol)
        case "name":
          return a.name.localeCompare(b.name)
        case "currentPrice":
          return a.currentPrice - b.currentPrice
        case "dayChange":
          return a.dayChange - b.dayChange
      }
    }
  )

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((w) => w.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {items.length > 0 && (
          <div className="flex items-center gap-3 border-b px-4 pb-2 text-xs font-medium text-muted-foreground">
            <div className="size-7 shrink-0" />
            <button
              className="w-14 shrink-0 cursor-pointer select-none text-left hover:text-foreground"
              onClick={() => toggleSort("symbol")}
            >
              Symbol <SortIcon col="symbol" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <button
              className="min-w-0 flex-1 cursor-pointer select-none text-left hover:text-foreground"
              onClick={() => toggleSort("name")}
            >
              Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <div className="hidden w-[80px] shrink-0 sm:block" />
            <button
              className="w-20 shrink-0 cursor-pointer select-none text-right hover:text-foreground"
              onClick={() => toggleSort("currentPrice")}
            >
              Price <SortIcon col="currentPrice" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <button
              className="w-16 shrink-0 cursor-pointer select-none text-center hover:text-foreground"
              onClick={() => toggleSort("dayChange")}
            >
              Change <SortIcon col="dayChange" sortKey={sortKey} sortDir={sortDir} />
            </button>
            <div className="w-[19px] shrink-0" />
          </div>
        )}
        <div className="divide-y">
          {sorted.map((w) => {
            const positive = w.dayChange >= 0
            return (
              <div
                key={w.id}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
              >
                {/* Logo + Symbol */}
                <Image
                  src={w.logo}
                  alt={w.name}
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-full"
                />
                <Badge variant="secondary" className="w-14 justify-center font-mono text-[11px]">
                  {w.symbol}
                </Badge>

                {/* Name */}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {w.name}
                </span>

                {/* Mini sparkline */}
                <div className="hidden sm:block w-[80px] h-[30px]">
                  <LineChart
                    width={80}
                    height={30}
                    data={w.sparklineData.map((v, i) => ({ i, v }))}
                  >
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={positive ? "var(--color-emerald-500)" : "var(--color-rose-500)"}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </div>

                {/* Price */}
                <span className="w-20 text-right text-sm font-medium tabular-nums">
                  ₱{w.currentPrice.toFixed(2)}
                </span>

                {/* Day change badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "w-16 justify-center tabular-nums text-[11px]",
                    positive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400"
                  )}
                >
                  {positive ? "+" : ""}
                  {w.dayChange.toFixed(2)}%
                </Badge>

                {/* Remove on hover */}
                <button
                  onClick={() => removeItem(w.id)}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${w.symbol}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}

          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Your watchlist is empty.
            </p>
          )}
        </div>

        <div className="px-4 pt-3">
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Plus className="size-3.5" />
            Add to Watchlist
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
