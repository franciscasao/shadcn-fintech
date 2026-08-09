import { and, asc, eq, gte, isNotNull, lt, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { budgetCategories, categories, savingsGoals, transactions } from "@/server/db/schema"
import { today, todayISO } from "@/lib/today"
import { toISODate } from "@/server/db/format"
import { getBudgetBucketMap } from "@/server/queries/categories"
import type { BudgetCategory, SavingsGoal } from "@/lib/types"

function currentMonthBounds(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start: toISODate(start), end: toISODate(end) }
}

/** "YYYY-MM" for the same calendar month getSpentByBucket sums over — passed
 * to BudgetRings so its "view transactions" links scope to the exact month
 * behind each ring's spent total (see TransactionFilters.month). */
export function currentBudgetMonth(): string {
  return todayISO().slice(0, 7)
}

/** Sum of expense amounts this calendar month, grouped by budget bucket
 * (fine-grained transaction categories collapsed via the categories table's
 * budgetBucket column — see src/server/queries/categories.ts). */
async function getSpentByBucket(): Promise<Map<string, number>> {
  const db = getDb()
  const { start, end } = currentMonthBounds(today())
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

  // How many transaction categories point at each bucket by name (see
  // categories.budgetBucket) — feeds the delete confirmation's impact copy.
  const countRows = db
    .select({
      budgetBucket: categories.budgetBucket,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(categories)
    .where(and(eq(categories.userId, DEMO_USER_ID), isNotNull(categories.budgetBucket)))
    .groupBy(categories.budgetBucket)
    .all()
  const countByBucket = new Map(countRows.map((r) => [r.budgetBucket, r.count]))

  return rows.map((b) => ({
    id: String(b.id),
    category: b.category,
    iconName: b.iconName,
    budget: b.budget,
    spent: Math.round((spentByBucket.get(b.category) ?? 0) * 100) / 100,
    color: b.color,
    categoryCount: countByBucket.get(b.category) ?? 0,
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
