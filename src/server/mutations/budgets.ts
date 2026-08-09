import { and, eq, ne, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { budgetCategories, categories, savingsGoals } from "@/server/db/schema"
import { ICON_COLORS } from "@/server/icon-colors"
import type { BudgetCategory } from "@/lib/types"

function findByName(
  db: ReturnType<typeof getDb>,
  name: string,
  excludeId?: number
) {
  const conditions = [
    eq(budgetCategories.userId, DEMO_USER_ID),
    eq(sql`lower(${budgetCategories.category})`, name.toLowerCase()),
  ]
  if (excludeId !== undefined) conditions.push(ne(budgetCategories.id, excludeId))
  return db
    .select({ id: budgetCategories.id })
    .from(budgetCategories)
    .where(and(...conditions))
    .get()
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
  if (findByName(db, input.category)) return null

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
    categoryCount: 0,
  }
}

export type BudgetCategoryUpdateInput = {
  category: string
  budget: number
  iconName: string
}

/** Renames/retargets/reicons a budget bucket. If the name changed, every
 * transaction category currently pointing at the old name (via
 * categories.budgetBucket — stored as free text, no FK) is repointed to the
 * new one in the same transaction, mirroring updateCategory's cascade in
 * @/server/mutations/categories. */
export async function updateBudgetCategory(
  id: number,
  input: BudgetCategoryUpdateInput
): Promise<BudgetCategory | "duplicate" | "not_found"> {
  const db = getDb()
  const existing = db
    .select()
    .from(budgetCategories)
    .where(and(eq(budgetCategories.id, id), eq(budgetCategories.userId, DEMO_USER_ID)))
    .get()
  if (!existing) return "not_found"
  if (findByName(db, input.category, id)) return "duplicate"

  const color = ICON_COLORS[input.iconName] ?? "text-muted-foreground"

  const row = db.transaction((tx) => {
    const [updated] = tx
      .update(budgetCategories)
      .set({ category: input.category, iconName: input.iconName, budget: input.budget, color })
      .where(eq(budgetCategories.id, id))
      .returning()
      .all()

    if (input.category !== existing.category) {
      tx.update(categories)
        .set({ budgetBucket: input.category })
        .where(
          and(eq(categories.userId, DEMO_USER_ID), eq(categories.budgetBucket, existing.category))
        )
        .run()
    }

    return updated
  })

  return {
    id: String(row.id),
    category: row.category,
    iconName: row.iconName,
    budget: row.budget,
    spent: 0,
    color: row.color,
    categoryCount: 0,
  }
}

/** Deletes `id`, repointing every category currently bucketed under it to
 * `reassignTo`'s name (or clearing to unbucketed when `reassignTo` is
 * null/absent), atomically. Unlike deleteCategory, reassignment is optional
 * — a category with no budget bucket is a normal, supported state. */
export async function deleteBudgetCategory(
  id: number,
  reassignTo: number | null
): Promise<"not_found" | void> {
  const db = getDb()
  const source = db
    .select()
    .from(budgetCategories)
    .where(and(eq(budgetCategories.id, id), eq(budgetCategories.userId, DEMO_USER_ID)))
    .get()
  if (!source) return "not_found"

  let targetName: string | null = null
  if (reassignTo !== null && reassignTo !== id) {
    const target = db
      .select()
      .from(budgetCategories)
      .where(and(eq(budgetCategories.id, reassignTo), eq(budgetCategories.userId, DEMO_USER_ID)))
      .get()
    if (!target) return "not_found"
    targetName = target.category
  }

  db.transaction((tx) => {
    tx.update(categories)
      .set({ budgetBucket: targetName })
      .where(and(eq(categories.userId, DEMO_USER_ID), eq(categories.budgetBucket, source.category)))
      .run()
    tx.delete(budgetCategories).where(eq(budgetCategories.id, id)).run()
  })
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
