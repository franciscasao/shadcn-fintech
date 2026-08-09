import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { SpendingLimitSummary } from "@/lib/types"
import { ShieldCheckIcon } from "lucide-react"

export function SpendingLimit({ spendingLimit }: { spendingLimit: SpendingLimitSummary }) {
  // budget is the sum of every budget category's target (see
  // getSpendingLimitSummary in @/server/queries/analytics) — 0 until the
  // owner sets any, which a bare spent/budget division would turn into
  // NaN/Infinity rather than a sane "no limit set yet" reading.
  const hasBudget = spendingLimit.budget > 0
  const percentUsed = hasBudget
    ? Math.round((spendingLimit.spent / spendingLimit.budget) * 100)
    : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Monthly Spending Limit
        </CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <ShieldCheckIcon className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {hasBudget ? `₱${spendingLimit.budget.toLocaleString()}` : "Not set"}{" "}
            {hasBudget && (
              <span className="text-sm font-normal text-muted-foreground">
                {spendingLimit.currency}
              </span>
            )}
          </p>
        </div>

        <Progress value={percentUsed} className="h-2" />

        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Spend</p>
            <p className="font-semibold tabular-nums">
              ₱{spendingLimit.spent.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                !hasBudget
                  ? "text-muted-foreground"
                  : spendingLimit.remaining < 0
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {hasBudget ? `₱${spendingLimit.remaining.toLocaleString()}` : "—"}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {spendingLimit.periodStart} - {spendingLimit.periodEnd}
        </p>
      </CardContent>
    </Card>
  )
}
