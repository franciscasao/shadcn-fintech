"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BudgetCategory } from "@/lib/types"
import { motion } from "motion/react"
import { WalletIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { budgetIconMap } from "@/components/budgets/budget-icons"
import { AddBudget, type NewBudgetInput } from "@/components/budgets/add-budget"

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function BudgetRings({
  budgetCategories,
  month,
}: {
  budgetCategories: BudgetCategory[]
  month: string
}) {
  const router = useRouter()

  async function handleAddBudget(input: NewBudgetInput) {
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error("Failed to add budget")
    router.refresh()
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Monthly Budgets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {budgetCategories.map((b, i) => {
            const percent = b.budget > 0 ? Math.min((b.spent / b.budget) * 100, 100) : 0
            const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE
            // No "over budget" reading until a budget is actually set —
            // otherwise every bucket flags red the moment any transaction
            // lands on a freshly bootstrapped (budget: 0) account.
            const isOver = b.budget > 0 && b.spent > b.budget
            const href = `/transactions?${new URLSearchParams({
              bucket: b.category,
              month,
              type: "expense",
            }).toString()}`

            return (
              <Link
                key={b.id}
                href={href}
                className="flex flex-col items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative size-24">
                  <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    {/* Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r={RADIUS}
                      fill="none"
                      stroke="currentColor"
                      className="text-muted"
                      strokeWidth="8"
                    />
                    {/* Progress */}
                    <motion.circle
                      cx="50"
                      cy="50"
                      r={RADIUS}
                      fill="none"
                      stroke="currentColor"
                      className={isOver ? "text-destructive" : b.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      initial={{ strokeDashoffset: CIRCUMFERENCE }}
                      animate={{
                        strokeDashoffset: offset,
                        ...(isOver
                          ? { scale: [1, 1.03, 1], opacity: [1, 0.8, 1] }
                          : {}),
                      }}
                      transition={{
                        strokeDashoffset: {
                          duration: 1,
                          delay: i * 0.1,
                          ease: "easeOut",
                        },
                        scale: isOver
                          ? { duration: 1.5, repeat: Infinity }
                          : undefined,
                        opacity: isOver
                          ? { duration: 1.5, repeat: Infinity }
                          : undefined,
                      }}
                    />
                  </svg>
                  {/* Center icon */}
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      isOver ? "text-destructive" : b.color
                    )}
                  >
                    {budgetIconMap[b.iconName] ?? <WalletIcon className="size-5" />}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">{b.category}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    ₱{b.spent.toLocaleString()}{" "}
                    <span className="text-muted-foreground/60">
                      {b.budget > 0 ? `/ ₱${b.budget.toLocaleString()}` : "· not set"}
                    </span>
                  </p>
                </div>
              </Link>
            )
          })}
          <AddBudget onAdd={handleAddBudget} />
        </div>
      </CardContent>
    </Card>
  )
}
