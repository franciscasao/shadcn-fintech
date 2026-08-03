import { asc, eq, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { categories, transactions } from "@/server/db/schema"
import type { Category } from "@/lib/types"

/** All user categories, each annotated with how many transactions currently
 * use it — powers the Categories settings tab (usage counts) and the
 * delete-and-reassign flow (which needs to know what's at stake). */
export async function getCategories(): Promise<Category[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(categories)
    .where(eq(categories.userId, DEMO_USER_ID))
    .orderBy(asc(categories.name))
    .all()

  const countRows = db
    .select({
      category: transactions.category,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(transactions)
    .where(eq(transactions.userId, DEMO_USER_ID))
    .groupBy(transactions.category)
    .all()
  const countByName = new Map(countRows.map((r) => [r.category, r.count]))

  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    iconName: r.iconName,
    color: r.color,
    budgetBucket: r.budgetBucket,
    transactionCount: countByName.get(r.name) ?? 0,
  }))
}

/** Category name -> budget bucket, for collapsing fine-grained transaction
 * categories into the 8 analytics/budget buckets. Replaces the old hardcoded
 * CATEGORY_TO_BUDGET_BUCKET (src/server/db/generate.ts) now that categories
 * are user-managed and can be renamed or added at runtime. */
export async function getBudgetBucketMap(): Promise<Record<string, string>> {
  const db = getDb()
  const rows = db
    .select({ name: categories.name, budgetBucket: categories.budgetBucket })
    .from(categories)
    .where(eq(categories.userId, DEMO_USER_ID))
    .all()

  const map: Record<string, string> = {}
  for (const r of rows) {
    if (r.budgetBucket) map[r.name] = r.budgetBucket
  }
  return map
}
