import { and, eq, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { budgetCategories, savingsGoals } from "@/server/db/schema"
import { ICON_COLORS } from "@/server/icon-colors"
import type { BudgetCategory } from "@/lib/types"

export async function updateBudgetCategoryTarget(id: number, budget: number) {
  const db = getDb()
  db.update(budgetCategories).set({ budget }).where(eq(budgetCategories.id, id)).run()
}

export type NewBudgetCategoryInput = {
  category: string
  budget: number
  iconName: string
}

/** Returns the created category, or `null` if one with the same name already exists. */
export async function createBudgetCategory(
  input: NewBudgetCategoryInput
): Promise<BudgetCategory | null> {
  const db = getDb()

  const existing = db
    .select({ id: budgetCategories.id })
    .from(budgetCategories)
    .where(
      and(
        eq(budgetCategories.userId, DEMO_USER_ID),
        eq(sql`lower(${budgetCategories.category})`, input.category.toLowerCase())
      )
    )
    .get()
  if (existing) return null

  const [row] = db
    .insert(budgetCategories)
    .values({
      userId: DEMO_USER_ID,
      category: input.category,
      iconName: input.iconName,
      budget: input.budget,
      color: ICON_COLORS[input.iconName] ?? "text-muted-foreground",
    })
    .returning()
    .all()

  return {
    id: String(row.id),
    category: row.category,
    iconName: row.iconName,
    budget: row.budget,
    spent: 0,
    color: row.color,
  }
}

export type NewSavingsGoalInput = {
  name: string
  targetAmount: number
  currentAmount?: number
  deadline: string
  iconName: string
  monthlyContribution: number
}

export async function createSavingsGoal(input: NewSavingsGoalInput) {
  const db = getDb()
  db.insert(savingsGoals)
    .values({ ...input, currentAmount: input.currentAmount ?? 0, userId: DEMO_USER_ID })
    .run()
}

export async function updateSavingsGoalProgress(id: number, currentAmount: number) {
  const db = getDb()
  db.update(savingsGoals).set({ currentAmount }).where(eq(savingsGoals.id, id)).run()
}
