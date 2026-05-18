"use client"

import { format } from "date-fns"
import { AlertTriangleIcon, PackageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CardData } from "@/data/seed"

interface CardControlsProps {
  card: CardData
  frozen: boolean
  onToggleFreeze: () => void
  dailyLimit: number
  onDailyLimitChange: (val: number) => void
  reportedReplacementDate?: Date
  onReportClick?: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function CardControls({
  card,
  frozen,
  onToggleFreeze,
  dailyLimit,
  onDailyLimitChange,
  reportedReplacementDate,
  onReportClick,
}: CardControlsProps) {
  const spendPercent =
    card.monthlyLimit > 0
      ? Math.round((card.monthlySpend / card.monthlyLimit) * 100)
      : 0
  const reported = !!reportedReplacementDate

  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Replacement banner ── */}
        {reported && reportedReplacementDate && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <PackageIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Replacement on the way
              </p>
              <p className="text-xs text-muted-foreground">
                Arrives {format(reportedReplacementDate, "EEE, MMM d")}. This card has been permanently disabled.
              </p>
            </div>
          </div>
        )}

        {/* ── Freeze Toggle ── */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Card Status</p>
            <p
              className={cn(
                "text-xs",
                reported ? "text-rose-600" : frozen ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {reported ? "Reported" : frozen ? "Frozen" : "Active"}
            </p>
          </div>
          <Switch
            checked={frozen}
            disabled={reported}
            onCheckedChange={(checked) => {
              if (checked !== frozen) onToggleFreeze()
            }}
          />
        </div>

        {/* ── Daily Limit ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Daily Limit</p>
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(dailyLimit)}
            </span>
          </div>
          <Slider
            value={[dailyLimit]}
            min={0}
            max={10000}
            step={100}
            onValueChange={(value) => {
              const v = Array.isArray(value) ? value[0] : value
              onDailyLimitChange(v)
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>$0</span>
            <span>$10,000</span>
          </div>
        </div>

        {/* ── Monthly Usage ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Monthly Usage</p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {spendPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                spendPercent >= 90
                  ? "bg-destructive"
                  : spendPercent >= 70
                    ? "bg-amber-500"
                    : "bg-primary",
              )}
              style={{ width: `${Math.min(spendPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatCurrency(card.monthlySpend)}</span>
            <span>{formatCurrency(card.monthlyLimit)}</span>
          </div>
        </div>

        {/* ── Card Info ── */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Card Info</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={card.type === "virtual" ? "secondary" : "outline"}>
              {card.type}
            </Badge>
            <Badge variant="outline" className="uppercase">
              {card.network}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              **** {card.last4}
            </span>
          </div>
        </div>

        {/* ── Report lost/stolen ── */}
        {!reported && onReportClick && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-rose-600 hover:bg-rose-500/5 hover:text-rose-600"
            onClick={onReportClick}
          >
            <AlertTriangleIcon className="size-3.5" />
            Report lost or stolen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
