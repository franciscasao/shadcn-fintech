"use client"

import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { SavingsGoal } from "@/lib/types"
import { savingsGoalIconMap } from "@/components/budgets/savings-goal-icons"
import { AddSavingsGoal, type NewSavingsGoalInput } from "@/components/budgets/add-savings-goal"

export function SavingsGoals({ savingsGoals }: { savingsGoals: SavingsGoal[] }) {
  const router = useRouter()

  async function handleAddSavingsGoal(input: NewSavingsGoalInput) {
    const res = await fetch("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Failed to add savings goal")
    }
    router.refresh()
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Savings Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {savingsGoals.map((g) => {
            const percent = Math.round(
              (g.currentAmount / g.targetAmount) * 100
            )
            const monthsLeft = Math.ceil(
              (g.targetAmount - g.currentAmount) / g.monthlyContribution
            )
            const projectedDate = new Date()
            projectedDate.setMonth(projectedDate.getMonth() + monthsLeft)
            const deadlineDate = new Date(g.deadline + " 1")
            const onTrack = projectedDate <= deadlineDate

            return (
              <div
                key={g.id}
                className="flex gap-4 rounded-xl border p-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {savingsGoalIconMap[g.iconName]}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{g.name}</p>
                    <Badge
                      variant={onTrack ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {onTrack ? "On track" : "Behind"}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold tabular-nums">
                      ₱{g.currentAmount.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / ₱{g.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={percent} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>₱{g.monthlyContribution}/mo</span>
                    <span>Target: {g.deadline}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <AddSavingsGoal onAdd={handleAddSavingsGoal} />
        </div>
      </CardContent>
    </Card>
  )
}
