import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { budgetCategories, savingsGoals } from "@/server/db/schema"

export async function updateBudgetCategoryTarget(id: number, budget: number) {
  const db = getDb()
  db.update(budgetCategories).set({ budget }).where(eq(budgetCategories.id, id)).run()
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
