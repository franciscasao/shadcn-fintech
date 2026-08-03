import { and, eq, ne, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { categories, transactions } from "@/server/db/schema"
import { ICON_COLORS } from "@/server/icon-colors"
import type { Category } from "@/lib/types"

function findByName(
  db: ReturnType<typeof getDb>,
  name: string,
  excludeId?: number
) {
  const conditions = [
    eq(categories.userId, DEMO_USER_ID),
    eq(sql`lower(${categories.name})`, name.toLowerCase()),
  ]
  if (excludeId !== undefined) conditions.push(ne(categories.id, excludeId))
  return db
    .select({ id: categories.id })
    .from(categories)
    .where(and(...conditions))
    .get()
}

function countUsage(db: ReturnType<typeof getDb>, name: string) {
  const row = db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(transactions)
    .where(and(eq(transactions.userId, DEMO_USER_ID), eq(transactions.category, name)))
    .get()
  return row?.count ?? 0
}

export type NewCategoryInput = {
  name: string
  iconName: string
  budgetBucket: string | null
}

/** Returns the created category, or `null` if one with the same name
 * (case-insensitive) already exists. */
export async function createCategory(input: NewCategoryInput): Promise<Category | null> {
  const db = getDb()
  if (findByName(db, input.name)) return null

  const [row] = db
    .insert(categories)
    .values({
      userId: DEMO_USER_ID,
      name: input.name,
      iconName: input.iconName,
      color: ICON_COLORS[input.iconName] ?? "text-muted-foreground",
      budgetBucket: input.budgetBucket,
    })
    .returning()
    .all()

  return {
    id: String(row.id),
    name: row.name,
    iconName: row.iconName,
    color: row.color,
    budgetBucket: row.budgetBucket,
    transactionCount: 0,
  }
}

export type CategoryUpdateInput = {
  name: string
  iconName: string
  budgetBucket: string | null
}

/** Renames/recolors/rebuckets a category. If the name changed, every
 * transaction currently filed under the old name is repointed to the new one
 * in the same transaction — categories are stored as free text on
 * `transactions.category`, so without this cascade a rename would silently
 * orphan every row that used the old name. */
export async function updateCategory(
  id: number,
  input: CategoryUpdateInput
): Promise<Category | "duplicate" | "not_found"> {
  const db = getDb()
  const existing = db.select().from(categories).where(eq(categories.id, id)).get()
  if (!existing) return "not_found"
  if (findByName(db, input.name, id)) return "duplicate"

  const color = ICON_COLORS[input.iconName] ?? "text-muted-foreground"

  const row = db.transaction((tx) => {
    const [updated] = tx
      .update(categories)
      .set({
        name: input.name,
        iconName: input.iconName,
        color,
        budgetBucket: input.budgetBucket,
      })
      .where(eq(categories.id, id))
      .returning()
      .all()

    if (input.name !== existing.name) {
      tx.update(transactions)
        .set({ category: input.name })
        .where(
          and(eq(transactions.userId, DEMO_USER_ID), eq(transactions.category, existing.name))
        )
        .run()
    }

    return updated
  })

  return {
    id: String(row.id),
    name: row.name,
    iconName: row.iconName,
    color: row.color,
    budgetBucket: row.budgetBucket,
    transactionCount: countUsage(db, row.name),
  }
}

/** Deletes `id`, reassigning every transaction currently filed under it to
 * `reassignToId`'s category name, atomically. */
export async function deleteCategory(
  id: number,
  reassignToId: number
): Promise<"not_found" | "same_category" | void> {
  if (id === reassignToId) return "same_category"

  const db = getDb()
  const source = db.select().from(categories).where(eq(categories.id, id)).get()
  const target = db.select().from(categories).where(eq(categories.id, reassignToId)).get()
  if (!source || !target) return "not_found"

  db.transaction((tx) => {
    tx.update(transactions)
      .set({ category: target.name })
      .where(and(eq(transactions.userId, DEMO_USER_ID), eq(transactions.category, source.name)))
      .run()
    tx.delete(categories).where(eq(categories.id, id)).run()
  })
}
