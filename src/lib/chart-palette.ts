// ---------------------------------------------------------------------------
// Analytics category colors — assigns each budget category a fixed hue from
// the 8-slot categorical palette in globals.css (--chart-1..--chart-8).
// ---------------------------------------------------------------------------

// Fixed identity slot per budget bucket — a category keeps the same hue
// regardless of amount or sort order.
const CATEGORY_SLOT: Record<string, number> = {
  "Food & Dining": 1,
  Transport: 2,
  Entertainment: 3,
  Shopping: 4,
  Subscriptions: 5,
  Health: 6,
  Travel: 7,
  Education: 8,
}

const SLOT_COUNT = Object.keys(CATEGORY_SLOT).length

function identitySlot(category: string): number {
  const known = CATEGORY_SLOT[category]
  if (known) return known
  // Fallback for a category outside the fixed map (e.g. a user-added budget
  // bucket) — deterministic so it doesn't jitter between renders.
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  }
  return (hash % SLOT_COUNT) + 1
}

export type ColorableRow = { category: string; amount: number }

/**
 * Assigns each row a `fill` CSS value from the fixed categorical palette.
 *
 * Color follows the category, not its rank, so re-sorting or filtering
 * never repaints a survivor. Budget categories are user-editable, so if
 * more than SLOT_COUNT show up at once, the smallest by amount fold into a
 * single "Other" row on the shared --color-chart-other token.
 */
export function assignCategoryColors<T extends ColorableRow>(
  rows: T[]
): (T & { fill: string })[] {
  if (rows.length <= SLOT_COUNT) {
    return rows.map((row) => ({
      ...row,
      fill: `var(--color-chart-${identitySlot(row.category)})`,
    }))
  }

  const sorted = [...rows].sort((a, b) => b.amount - a.amount)
  const visible = sorted.slice(0, SLOT_COUNT - 1).map((row) => ({
    ...row,
    fill: `var(--color-chart-${identitySlot(row.category)})`,
  }))
  const rest = sorted.slice(SLOT_COUNT - 1)
  const other = {
    ...rest[0],
    category: "Other",
    amount: rest.reduce((sum, r) => sum + r.amount, 0),
    fill: "var(--color-chart-other)",
  }
  return [...visible, other]
}
