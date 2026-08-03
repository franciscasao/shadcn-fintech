import { and, asc, eq, gte, lt, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { budgetCategories, savingsGoals, transactions } from "@/server/db/schema"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
import { getBudgetBucketMap } from "@/server/queries/categories"
import type { BudgetCategory, SavingsGoal } from "@/lib/types"

function currentMonthBounds() {
  const start = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth(), 1)
  const end = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth() + 1, 1)
  return { start: toISODate(start), end: toISODate(end) }
}

/** Sum of expense amounts this calendar month, grouped by budget bucket
 * (fine-grained transaction categories collapsed via the categories table's
 * budgetBucket column — see src/server/queries/categories.ts). */
async function getSpentByBucket(): Promise<Map<string, number>> {
  const db = getDb()
  const { start, end } = currentMonthBounds()
  const rows = db
    .select({
      category: transactions.category,
      total: sql<number>`sum(abs(${transactions.amount}))`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, DEMO_USER_ID),
        eq(transactions.type, "expense"),
        gte(transactions.date, start),
        lt(transactions.date, end)
      )
    )
    .groupBy(transactions.category)
    .all()
  const bucketMap = await getBudgetBucketMap()

  const byBucket = new Map<string, number>()
  for (const row of rows) {
    const bucket = bucketMap[row.category] ?? row.category
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + row.total)
  }
  return byBucket
}

/** The budget-bucket categories in their canonical order — derived from the
 * budgetCategories table (seeded once, id order = display order) rather than
 * a hardcoded list, so it stays correct if that table is ever edited. */
export async function getBudgetBuckets(): Promise<string[]> {
  const db = getDb()
  const rows = db
    .select({ category: budgetCategories.category })
    .from(budgetCategories)
    .where(eq(budgetCategories.userId, DEMO_USER_ID))
    .orderBy(asc(budgetCategories.id))
    .all()
  return rows.map((r) => r.category)
}

export async function getBudgetCategories(): Promise<BudgetCategory[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.userId, DEMO_USER_ID))
    .all()
  const spentByBucket = await getSpentByBucket()

  return rows.map((b) => ({
    id: String(b.id),
    category: b.category,
    iconName: b.iconName,
    budget: b.budget,
    spent: Math.round((spentByBucket.get(b.category) ?? 0) * 100) / 100,
    color: b.color,
  }))
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, DEMO_USER_ID))
    .all()
  return rows.map((g) => ({
    id: String(g.id),
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    deadline: g.deadline,
    iconName: g.iconName,
    monthlyContribution: g.monthlyContribution,
  }))
}
