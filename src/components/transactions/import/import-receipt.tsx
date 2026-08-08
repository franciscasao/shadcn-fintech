"use client"

import { CheckCircle2Icon, CopyIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { ImportResult } from "@/lib/import/types"

// The old "done" step was a single sentence of plain text — no acknowledgment
// that the import actually landed. This gives the three outcome numbers the
// same tile treatment as transaction-summary.tsx so a successful import
// reads as a finished, confirmed action rather than a line of copy.

interface ImportReceiptProps {
  result: ImportResult
  onImportAnother: () => void
  onDone: () => void
}

export function ImportReceipt({ result, onImportAnother, onDone }: ImportReceiptProps) {
  const tiles = [
    { label: "Created", value: result.created, icon: CheckCircle2Icon, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    {
      label: "Duplicates skipped",
      value: result.skippedDuplicates,
      icon: CopyIcon,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    {
      label: "Failed",
      value: result.failed.length,
      icon: TriangleAlertIcon,
      color: result.failed.length > 0 ? "text-destructive" : "text-muted-foreground",
      bg: result.failed.length > 0 ? "bg-destructive/10" : "bg-muted",
    },
  ]

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2Icon className="size-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Import complete</p>
            <p className="text-xs text-muted-foreground">
              {result.created} transaction{result.created === 1 ? "" : "s"} written to the ledger.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
              <div className={cn("flex size-8 items-center justify-center rounded-full", tile.bg)}>
                <tile.icon className={cn("size-3.5", tile.color)} />
              </div>
              <div>
                <p className="tabular-nums text-lg font-semibold tracking-tight">{tile.value}</p>
                <p className="text-xs text-muted-foreground">{tile.label}</p>
              </div>
            </div>
          ))}
        </div>

        {result.failed.length > 0 && (
          <ul className="max-h-32 list-disc overflow-auto rounded-lg bg-muted/50 p-3 pl-7 text-xs text-muted-foreground">
            {result.failed.map((f) => (
              <li key={f.index}>
                Row {f.index + 1}: {f.reason}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onImportAnother}>
            Import another statement
          </Button>
          <Button size="sm" className="flex-1" onClick={onDone}>
            Back to transactions
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
