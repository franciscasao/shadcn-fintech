"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BudgetCategory } from "@/lib/types"
import { motion } from "motion/react"
import { MoreHorizontalIcon, PencilIcon, TrashIcon, WalletIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { budgetIconMap } from "@/components/budgets/budget-icons"
import { AddBudget, type NewBudgetInput } from "@/components/budgets/add-budget"
import { BudgetDialog, type BudgetFormInput } from "@/components/budgets/budget-dialog"
import { DeleteBudgetDialog } from "@/components/budgets/delete-budget-dialog"

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
  const [editTarget, setEditTarget] = useState<BudgetCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BudgetCategory | null>(null)

  async function handleAddBudget(input: NewBudgetInput) {
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Failed to add budget")
    }
    router.refresh()
  }

  async function handleUpdateBudget(id: string, input: BudgetFormInput) {
    const res = await fetch(`/api/budgets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Failed to update budget")
    }
    router.refresh()
  }

  async function handleDeleteBudget(id: string, reassignToId: string | null) {
    const res = await fetch(`/api/budgets/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reassignTo: reassignToId ? Number(reassignToId) : null }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Failed to delete budget")
    }
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
              <div key={b.id} className="group relative">
                <div className="absolute right-1 top-1 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 aria-expanded:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end">
                      <DropdownMenuItem onClick={() => setEditTarget(b)}>
                        <PencilIcon className="size-3.5" />
                        Edit budget
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(b)}>
                        <TrashIcon className="size-3.5" />
                        Delete budget
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link
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
              </div>
            )
          })}
          <AddBudget onAdd={handleAddBudget} />
        </div>
      </CardContent>
      <BudgetDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onUpdate={handleUpdateBudget}
      />
      <DeleteBudgetDialog
        budget={deleteTarget}
        budgets={budgetCategories}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDelete={handleDeleteBudget}
      />
    </Card>
  )
}
