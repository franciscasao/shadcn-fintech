// Brings a freshly-migrated (but otherwise empty) database up to the bare
// minimum the app needs to run: the single user row (see DEMO_USER_ID) and
// the reference vocabulary — the category taxonomy and budget-bucket names
// — that the UI assumes exists (getCurrentUser() throws without the user
// row, see @/server/queries/user; the categories/budgets pages are blank
// without the rest).
//
// Idempotent and additive-only — insert-if-missing, NEVER delete. Safe to
// run against a database that already has real data in it, unlike
// seed.ts (which is destructive and dev-only). This is what a production
// deployment runs on every boot (see src/instrumentation.ts), and it's also
// exposed directly as `pnpm db:bootstrap` for local use.
//
// Budget buckets are the one exception to "insert-if-missing per row": once
// a user can rename/delete budgets (see @/server/mutations/budgets), reseeding
// the 8 reference buckets by name on every boot would resurrect a deleted
// one and duplicate a renamed one. So that loop only runs on a database that
// has no budget_categories rows at all — a first, empty boot — never after.
//
// No accounts, cards, contacts, transfers, notifications, savings goals, or
// transactions — none of that is reference data, and none of it belongs in
// a real user's database until they add it themselves.
//
// SKIP_CATEGORY_SEED=true opts a deployment out of the category-fixtures
// loop below (e.g. a server that manages its own category taxonomy some
// other way). Everything else in bootstrap — the user row, budget buckets —
// still seeds normally.

import { eq, and } from "drizzle-orm"

import { getDb, DEMO_USER_ID } from "./index"
import * as schema from "./schema"
import { DEFAULT_USER, categoryFixtures, budgetBucketReference } from "./reference"

export async function bootstrap() {
  const db = getDb()

  const existingUser = db.select().from(schema.users).where(eq(schema.users.id, DEMO_USER_ID)).get()
  if (!existingUser) {
    db.insert(schema.users)
      .values({ id: DEMO_USER_ID, ...DEFAULT_USER })
      .run()
    console.log("[bootstrap] Seeded user.")
  }

  if (process.env.SKIP_CATEGORY_SEED === "true") {
    console.log("[bootstrap] SKIP_CATEGORY_SEED=true — skipping category fixtures.")
  } else {
    for (const c of categoryFixtures) {
      const existing = db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(and(eq(schema.categories.userId, DEMO_USER_ID), eq(schema.categories.name, c.name)))
        .get()
      if (existing) continue
      db.insert(schema.categories)
        .values({ ...c, userId: DEMO_USER_ID })
        .run()
      console.log(`[bootstrap] Seeded category: ${c.name}`)
    }
  }

  const hasAnyBudgetCategory = db
    .select({ id: schema.budgetCategories.id })
    .from(schema.budgetCategories)
    .where(eq(schema.budgetCategories.userId, DEMO_USER_ID))
    .get()
  if (!hasAnyBudgetCategory) {
    for (const b of budgetBucketReference) {
      // budget: 0 — no target amount until the owner sets one. See the
      // "hasBudget" guards in budget-rings.tsx and spending-limit.tsx, which
      // treat 0 as "not configured" rather than "0 allowed to spend".
      db.insert(schema.budgetCategories)
        .values({ ...b, budget: 0, userId: DEMO_USER_ID })
        .run()
      console.log(`[bootstrap] Seeded budget bucket: ${b.category}`)
    }
  }
}

// Allow running directly (`pnpm db:bootstrap`) as well as being imported by
// the runtime migration hook (src/instrumentation.ts) — this codebase runs
// as ESM (see "module": "esnext" in tsconfig.json), so the entry-point
// check is import.meta-based rather than CommonJS's require.main.
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap()
    .then(() => console.log("[bootstrap] Done."))
    .catch((err) => {
      console.error("[bootstrap] Failed:", err)
      process.exit(1)
    })
}
