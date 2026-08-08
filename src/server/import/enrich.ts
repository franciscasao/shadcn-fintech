import { addDays, format, parseISO } from "date-fns"
import { and, eq, gte, lte, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { transactions } from "@/server/db/schema"
import { dayOffset, merchantsLikelyMatch, normalizeMerchant } from "@/server/import/normalize"
import type { DraftIssue, DraftTransaction } from "@/lib/import/types"

// ---------------------------------------------------------------------------
// DB-backed enrichment for the import preview: flags rows that look like
// they're already in the ledger, and guesses a category for rows that don't
// have one, both from the user's own transaction history. No LLM — pure
// lookups against data already in the database.
// ---------------------------------------------------------------------------

type ExistingTxn = { id: number; transactionId: string; date: string; amount: number; merchant: string }

/** Loads existing ledger rows in the date range the draft rows span, padded
 * by a day on each side to catch the ±1-day "likely duplicate" case (a
 * transaction date vs. posting date can differ by a day). Imports are
 * inherently a contiguous statement period, so this is a small slice of the
 * ledger rather than a full-table scan. */
function loadCandidateExisting(minDate: string, maxDate: string): ExistingTxn[] {
  const db = getDb()
  const from = format(addDays(parseISO(minDate), -1), "yyyy-MM-dd")
  const to = format(addDays(parseISO(maxDate), 1), "yyyy-MM-dd")

  return db
    .select({
      id: transactions.id,
      transactionId: transactions.transactionId,
      date: transactions.date,
      amount: transactions.amount,
      merchant: transactions.merchant,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, DEMO_USER_ID),
        gte(transactions.date, from),
        lte(transactions.date, to)
      )
    )
    .all()
}

/** Flags each row that matches an existing ledger entry on signed amount and
 * a fuzzy merchant match, either on the same date (exact — pre-excluded by
 * default) or within a day (likely — flagged but left included, since date
 * drift alone isn't strong enough evidence to silently drop a row). Also
 * flags rows that duplicate another row earlier in the same file, which
 * happens when a statement's PDF export repeats a page. */
export function detectDuplicates(rows: DraftTransaction[]): void {
  if (rows.length === 0) return

  const dates = rows.map((r) => r.date).filter(Boolean)
  if (dates.length === 0) return
  const minDate = dates.reduce((a, b) => (a < b ? a : b))
  const maxDate = dates.reduce((a, b) => (a > b ? a : b))

  const existing = loadCandidateExisting(minDate, maxDate)
  const byKey = new Map<string, ExistingTxn[]>()
  for (const row of existing) {
    const key = row.amount.toFixed(2)
    const bucket = byKey.get(key) ?? []
    bucket.push(row)
    byKey.set(key, bucket)
  }

  const seenInFile = new Map<string, DraftTransaction>()

  for (const row of rows) {
    if (!row.date) continue
    const signed = row.type === "expense" ? -Math.abs(row.amount) : Math.abs(row.amount)
    const normMerchant = normalizeMerchant(row.merchant)

    const fileKey = `${row.date}|${signed.toFixed(2)}|${normMerchant}`
    const dupeInFile = seenInFile.get(fileKey)
    if (dupeInFile) {
      row.issues.push({ level: "warning", message: "Duplicate of another row in this file" })
      row.include = false
      continue
    }
    seenInFile.set(fileKey, row)

    const candidates = byKey.get(signed.toFixed(2)) ?? []
    let best: { row: ExistingTxn; exact: boolean } | null = null
    for (const candidate of candidates) {
      if (!merchantsLikelyMatch(normMerchant, normalizeMerchant(candidate.merchant))) continue
      const offset = Math.abs(dayOffset(row.date, candidate.date))
      if (offset > 1) continue
      const exact = offset === 0
      if (!best || (exact && !best.exact)) best = { row: candidate, exact }
    }

    if (best) {
      row.duplicateOf = { transactionId: best.row.transactionId, exact: best.exact }
      row.issues.push({
        level: "warning",
        message: best.exact
          ? `Matches an existing transaction (${best.row.transactionId})`
          : `Close match to an existing transaction (${best.row.transactionId}, ${best.row.date})`,
      })
      if (best.exact) row.include = false
    }
  }
}

/** Merchant -> most-frequently-used category, built from the user's own
 * ledger. One grouped query, independent of how many draft rows need a
 * guess. */
function loadMerchantCategoryHistory(): Map<string, string> {
  const db = getDb()
  const rows = db
    .select({
      merchant: transactions.merchant,
      category: transactions.category,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(transactions)
    .where(eq(transactions.userId, DEMO_USER_ID))
    .groupBy(transactions.merchant, transactions.category)
    .all()

  const best = new Map<string, { category: string; count: number }>()
  for (const row of rows) {
    const key = normalizeMerchant(row.merchant)
    if (!key) continue
    const current = best.get(key)
    if (!current || row.count > current.count) {
      best.set(key, { category: row.category, count: row.count })
    }
  }
  return new Map(Array.from(best, ([k, v]) => [k, v.category]))
}

// A small starter set for merchants that aren't in the user's own history
// yet, so a first-ever import doesn't leave every row uncategorized.
// Guesses are only ever applied when the target category name exists in
// the user's categories table (checked by the caller) — this table names
// the categories seeded by src/server/db/fixtures.ts, but any renamed or
// custom category set simply won't get keyword guesses, which is fine.
const KEYWORD_CATEGORIES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /grab|uber|taxi|angkas|lrt|mrt|jeep|toll/i, category: "Transport" },
  { pattern: /jollibee|mcdo|kfc|starbucks|restaurant|cafe|food|grocery|supermarket|sm mart|puregold/i, category: "Food & Dining" },
  { pattern: /netflix|spotify|disney|hbo|cinema|movie/i, category: "Entertainment" },
  { pattern: /lazada|shopee|amazon|shop|store|mall/i, category: "Shopping" },
  { pattern: /hospital|clinic|pharmacy|mercury drug|watsons/i, category: "Health" },
  { pattern: /tuition|school|university|coursera|udemy/i, category: "Education" },
  { pattern: /airline|hotel|booking|airbnb|agoda|cebu pacific|philippine airlines/i, category: "Travel" },
  { pattern: /apple|google|microsoft|adobe|software|saas/i, category: "Technology" },
  { pattern: /salary|payroll|deposit.*salary/i, category: "Income" },
]

/** Assigns each uncategorized draft row a category name, using — in order —
 * an exact normalized-merchant match against the user's history, a
 * containment match against the same history, then the keyword table
 * above. Only names present in `validCategories` are ever assigned, since
 * the settings page's per-category usage counts assume every
 * transactions.category value corresponds to a real category row. A row
 * that still ends up with no guess is left with an empty category — that's
 * reported once, as an error, by validateDraftRow below, rather than also
 * warning about it here. */
export function guessCategories(rows: DraftTransaction[], validCategories: string[]): void {
  const validSet = new Set(validCategories)
  const history = loadMerchantCategoryHistory()
  const historyEntries = Array.from(history.entries())

  for (const row of rows) {
    if (row.category) continue
    const norm = normalizeMerchant(row.merchant)
    if (!norm) continue

    let guess = history.get(norm)
    if (!guess) {
      const hit = historyEntries.find(([key]) => merchantsLikelyMatch(norm, key))
      guess = hit?.[1]
    }
    if (!guess) {
      guess = KEYWORD_CATEGORIES.find((k) => k.pattern.test(row.merchant))?.category
    }

    if (guess && validSet.has(guess)) row.category = guess
  }
}

/** Structural validation independent of the enrichment heuristics above —
 * called last so its errors get prepended ahead of the duplicate/category
 * warnings already on the row (see the preview route handler). Mirrors the
 * field checks in POST /api/transactions/route.ts. */
export function validateDraftRow(row: DraftTransaction): DraftIssue[] {
  const issues: DraftIssue[] = []
  if (!row.date) issues.push({ level: "error", message: "Date is missing or unrecognized" })
  if (!row.merchant.trim()) issues.push({ level: "error", message: "Merchant is required" })
  if (!Number.isFinite(row.amount) || row.amount <= 0) {
    issues.push({ level: "error", message: "Amount must be a positive number" })
  }
  if (!row.category) issues.push({ level: "error", message: "Category is required" })
  return issues
}
