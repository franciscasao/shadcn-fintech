import { ICON_COLORS } from "@/server/icon-colors"

// ---------------------------------------------------------------------------
// Reference data: the fixed vocabulary the rest of the app is built around
// (category taxonomy, budget buckets, the owner identity) — as opposed to
// fixture data (src/server/db/fixtures.ts), which is fictional demo content.
//
// This file has NO fake balances, transactions, or dates. It's imported by
// both:
//   - src/server/db/bootstrap.ts — the idempotent, production-safe seed that
//     gives a freshly-migrated (but otherwise empty) database enough to be
//     usable: a user row and the category/budget vocabulary the UI assumes
//     exists (see getCurrentUser() throwing in @/server/queries/user, and
//     getBudgetBucketMap() in @/server/queries/categories).
//   - src/server/db/fixtures.ts — the full demo dataset, which layers
//     invented amounts on top of this same vocabulary so local dev always
//     matches what a real deployment starts with.
// ---------------------------------------------------------------------------

/** The single account this app runs as (see DEMO_USER_ID in @/server/db) —
 * overridable via env so a real deployment shows its owner's name instead of
 * a placeholder, without touching seed code. */
export const DEFAULT_USER = {
  name: process.env.OWNER_NAME ?? "Francis Casao",
  email: process.env.OWNER_EMAIL ?? "francis.casao@vault.dev",
  avatar: "/avatars/user.jpg",
}

/** Maps a fine-grained transaction category to one of the 8 budget-bucket
 * categories used by budget_categories and the analytics category breakdown.
 * "Income" and "Transfer" have no bucket — excluded from spending aggregates. */
export const CATEGORY_TO_BUDGET_BUCKET: Record<string, string> = {
  "Food & Dining": "Food & Dining",
  Transport: "Transport",
  Entertainment: "Entertainment",
  Shopping: "Shopping",
  Health: "Health",
  Travel: "Travel",
  Education: "Education",
  Technology: "Subscriptions",
  Design: "Subscriptions",
  "AI Tools": "Subscriptions",
  Productivity: "Subscriptions",
}

export const BUDGET_BUCKETS = [
  "Food & Dining",
  "Transport",
  "Entertainment",
  "Shopping",
  "Subscriptions",
  "Health",
  "Education",
  "Travel",
] as const

/** The 13-category taxonomy every account (demo or real) starts with —
 * without these, the categories UI and every category picker is blank. */
export const categoryFixtures = [
  { name: "Food & Dining", iconName: "utensils" },
  { name: "Transport", iconName: "car" },
  { name: "Entertainment", iconName: "gamepad-2" },
  { name: "Shopping", iconName: "shopping-bag" },
  { name: "Health", iconName: "heart-pulse" },
  { name: "Education", iconName: "graduation-cap" },
  { name: "Travel", iconName: "plane" },
  { name: "Technology", iconName: "cpu" },
  { name: "Design", iconName: "palette" },
  { name: "AI Tools", iconName: "sparkles" },
  { name: "Productivity", iconName: "check-square" },
  { name: "Income", iconName: "banknote" },
  { name: "Transfer", iconName: "repeat" },
].map((c) => ({
  ...c,
  color: ICON_COLORS[c.iconName],
  budgetBucket: CATEGORY_TO_BUDGET_BUCKET[c.name] ?? null,
}))

/** The 8 budget-bucket rows (name/icon/color) every account starts with, in
 * their canonical display order — matches BUDGET_BUCKETS above. No `budget`
 * amount: that's a number only the account owner should set, so bootstrap
 * seeds these at 0 and fixtures.ts layers placeholder amounts on top for
 * local dev only (see budgetCategoryFixtures). */
export const budgetBucketReference: { category: string; iconName: string; color: string }[] = [
  { category: "Food & Dining", iconName: "utensils", color: "text-orange-500" },
  { category: "Transport", iconName: "car", color: "text-blue-500" },
  { category: "Entertainment", iconName: "gamepad-2", color: "text-purple-500" },
  { category: "Shopping", iconName: "shopping-bag", color: "text-pink-500" },
  { category: "Subscriptions", iconName: "repeat", color: "text-cyan-500" },
  { category: "Health", iconName: "heart-pulse", color: "text-emerald-500" },
  { category: "Education", iconName: "graduation-cap", color: "text-amber-500" },
  { category: "Travel", iconName: "plane", color: "text-rose-500" },
]
