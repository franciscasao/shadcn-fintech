"use client"

import { useState, useMemo, useCallback } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { SearchIcon, PlusIcon } from "lucide-react"
import { motion } from "motion/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { logo } from "@/data/seed"
import type { WatchlistItem } from "@/data/seed"
import { cn } from "@/lib/utils"

type Candidate = {
  symbol: string
  name: string
  logo: string
  price: number
  dayChange: number
  sector: string
}

const candidates: Candidate[] = [
  { symbol: "DIS", name: "Walt Disney", logo: logo("disney.com"), price: 102.45, dayChange: 0.92, sector: "Media" },
  { symbol: "UBER", name: "Uber Technologies", logo: logo("uber.com"), price: 78.30, dayChange: 2.14, sector: "Transport" },
  { symbol: "ABNB", name: "Airbnb", logo: logo("airbnb.com"), price: 156.80, dayChange: -0.45, sector: "Travel" },
  { symbol: "SHOP", name: "Shopify", logo: logo("shopify.com"), price: 89.20, dayChange: 1.87, sector: "E-commerce" },
  { symbol: "INTC", name: "Intel", logo: logo("intel.com"), price: 32.10, dayChange: -1.20, sector: "Technology" },
  { symbol: "ORCL", name: "Oracle", logo: logo("oracle.com"), price: 142.50, dayChange: 0.34, sector: "Technology" },
  { symbol: "ADBE", name: "Adobe", logo: logo("adobe.com"), price: 542.10, dayChange: 1.45, sector: "Software" },
  { symbol: "NKE", name: "Nike", logo: logo("nike.com"), price: 72.80, dayChange: -0.78, sector: "Retail" },
]

interface AddWatchlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSymbols: string[]
  onAdd: (item: WatchlistItem) => void
}

export function AddWatchlistDialog({
  open,
  onOpenChange,
  existingSymbols,
  onAdd,
}: AddWatchlistDialogProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    )
  }, [query])

  const handleAdd = useCallback(
    (c: Candidate) => {
      const item: WatchlistItem = {
        id: `w-${c.symbol}-${Date.now()}`,
        symbol: c.symbol,
        name: c.name,
        currentPrice: c.price,
        dayChange: c.dayChange,
        logo: c.logo,
        sparklineData: Array.from(
          { length: 30 },
          (_, i) => c.price + Math.sin(i * 0.4) * c.price * 0.02,
        ),
      }
      onAdd(item)
      toast.success(`Added ${c.symbol}`, {
        description: `${c.name} now in your watchlist.`,
      })
      onOpenChange(false)
      setQuery("")
    },
    [onAdd, onOpenChange],
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery("")
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to watchlist</DialogTitle>
          <DialogDescription>
            Search for a stock by name or ticker symbol.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AAPL, Tesla..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="-mx-1 max-h-[280px] overflow-y-auto px-1">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => {
                const exists = existingSymbols.includes(c.symbol)
                return (
                  <motion.div
                    key={c.symbol}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <Image
                      src={c.logo}
                      alt={c.name}
                      width={28}
                      height={28}
                      className="size-7 shrink-0 rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {c.symbol}
                        </Badge>
                        <p className="truncate text-sm font-medium">{c.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{c.sector}</p>
                    </div>
                    <p className="hidden text-sm tabular-nums sm:block">
                      ${c.price.toFixed(2)}
                    </p>
                    <Button
                      size="sm"
                      variant={exists ? "secondary" : "outline"}
                      onClick={() => !exists && handleAdd(c)}
                      disabled={exists}
                      className={cn("shrink-0 gap-1", exists && "pointer-events-none")}
                    >
                      {exists ? "Added" : (<><PlusIcon className="size-3" /> Add</>)}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
