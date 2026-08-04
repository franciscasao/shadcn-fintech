"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { LineChart, Line } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"
import { motion } from "motion/react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { holdings as seedHoldings, type Holding } from "@/data/seed"
import { useTableSort } from "@/hooks/use-table-sort"
import { SortIcon } from "@/components/sort-icon"

type SortKey = "name" | "quantity" | "avgBuyPrice" | "currentPrice" | "plPct" | "plDollar"

function getPl(h: Holding) {
  const pct = ((h.currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100
  const dollar = (h.currentPrice - h.avgBuyPrice) * h.quantity
  return { pct, dollar }
}

export function HoldingsTable() {
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const h of seedHoldings) map[h.id] = h.currentPrice
    return map
  })
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down" | null>>({})
  const prevPrices = useRef<Record<string, number>>({ ...prices })

  // Live price simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) => {
        const next = { ...prev }
        const flashes: Record<string, "up" | "down" | null> = {}
        for (const h of seedHoldings) {
          const change = 1 + (Math.random() - 0.5) * 0.006 // +/- 0.3%
          const newPrice = Math.round(prev[h.id] * change * 100) / 100
          if (newPrice !== prev[h.id]) {
            flashes[h.id] = newPrice > prev[h.id] ? "up" : "down"
          }
          next[h.id] = newPrice
        }
        prevPrices.current = prev
        setFlashMap(flashes)
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Clear flash after animation
  useEffect(() => {
    if (Object.keys(flashMap).length === 0) return
    const t = setTimeout(() => setFlashMap({}), 600)
    return () => clearTimeout(t)
  }, [flashMap])

  const holdings = useMemo(
    () =>
      seedHoldings.map((h) => ({
        ...h,
        currentPrice: prices[h.id] ?? h.currentPrice,
      })),
    [prices]
  )

  const { sortKey, sortDir, toggleSort: cycleSortDir, sorted } = useTableSort<
    (typeof holdings)[number],
    SortKey
  >(holdings, (a, b, key) => {
    switch (key) {
      case "name":
        return a.name.localeCompare(b.name)
      case "quantity":
        return a.quantity - b.quantity
      case "avgBuyPrice":
        return a.avgBuyPrice - b.avgBuyPrice
      case "currentPrice":
        return a.currentPrice - b.currentPrice
      case "plPct":
        return getPl(a).pct - getPl(b).pct
      case "plDollar":
        return getPl(a).dollar - getPl(b).dollar
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none pl-4"
                onClick={() => cycleSortDir("name")}
              >
                Asset <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="hidden cursor-pointer select-none text-right sm:table-cell"
                onClick={() => cycleSortDir("quantity")}
              >
                Qty <SortIcon col="quantity" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="hidden cursor-pointer select-none text-right lg:table-cell"
                onClick={() => cycleSortDir("avgBuyPrice")}
              >
                Avg Buy <SortIcon col="avgBuyPrice" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => cycleSortDir("currentPrice")}
              >
                Current <SortIcon col="currentPrice" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => cycleSortDir("plPct")}
              >
                P&L % <SortIcon col="plPct" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="hidden cursor-pointer select-none text-right md:table-cell"
                onClick={() => cycleSortDir("plDollar")}
              >
                P&L ₱ <SortIcon col="plDollar" sortKey={sortKey} sortDir={sortDir} />
              </TableHead>
              <TableHead className="hidden text-right pr-4 xl:table-cell">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((h) => {
              const pl = getPl(h)
              const positive = pl.pct >= 0
              const flash = flashMap[h.id]
              return (
                <TableRow key={h.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <Image
                        src={h.logo}
                        alt={h.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="rounded-full"
                      />
                      <div>
                        <div className="font-medium">{h.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.symbol}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {h.quantity}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    ₱{h.avgBuyPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <motion.span
                      key={`${h.id}-${prices[h.id]}`}
                      initial={{
                        backgroundColor:
                          flash === "up"
                            ? "var(--color-emerald-500/0.2)"
                            : flash === "down"
                              ? "var(--color-rose-500/0.2)"
                              : "transparent",
                      }}
                      animate={{ backgroundColor: "transparent" }}
                      transition={{ duration: 0.6 }}
                      className="rounded px-1 py-0.5"
                    >
                      ₱{h.currentPrice.toFixed(2)}
                    </motion.span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {positive ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                      {positive ? "+" : ""}
                      {pl.pct.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden text-right tabular-nums font-medium md:table-cell",
                      positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {positive ? "+" : ""}
                    ₱{pl.dollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="hidden pr-4 xl:table-cell">
                    <div className="ml-auto w-[80px] h-[30px]">
                      <LineChart
                        width={80}
                        height={30}
                        data={h.sparklineData.map((v, i) => ({ i, v }))}
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  )
}
