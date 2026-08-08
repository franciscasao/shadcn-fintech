import { addDays, format, parseISO } from "date-fns"
import { and, eq, gte, lte } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, cards, categories, transactions } from "@/server/db/schema"
import { assertCardAccountPairing, generateTransactionId } from "@/server/mutations/transactions"
import { dayOffset, merchantsLikelyMatch, normalizeMerchant } from "@/server/import/normalize"
import { ISO_DATE_RE, type ImportResult, type ImportRow } from "@/lib/import/types"

// Bulk counterpart to createTransaction (@/server/mutations/transactions) —
// commits every row of a confirmed import preview in one db.transaction,
// mirroring the batching/error-collection shape of deleteTransactions in
// that same file: bad rows are collected into `failed` rather than aborting
// the whole batch, and account balance deltas are aggregated once instead
// of one UPDATE per row.

/** All rows in one import share a single target — the account/card picker
 * sits above the whole preview table, not per row (see
 * ImportStatementPageClient). Same accountId/cardId pairing rules as
 * NewTransactionInput: null accountId only when cardId resolves to a
 * credit card. */
export type ImportTarget = {
  accountId: number | null
  cardId?: number
}

const CHUNK_SIZE = 200
// SQLite duplicate matching treats amounts equal within a cent as the same
// value, matching the rounding every balance write in this app already uses.
const AMOUNT_EPSILON = 0.005

export async function importTransactions(
  rows: ImportRow[],
  target: ImportTarget
): Promise<ImportResult> {
  const db = getDb()

  return db.transaction((tx) => {
    if (rows.length === 0) return { created: 0, skippedDuplicates: 0, failed: [] }

    let card: typeof cards.$inferSelect | null = null
    if (target.cardId != null) {
      card = tx.select().from(cards).where(eq(cards.id, target.cardId)).get() ?? null
      if (!card || card.userId !== DEMO_USER_ID) {
        throw new Error(`Card ${target.cardId} not found`)
      }
    }

    let account: typeof accounts.$inferSelect | null = null
    if (target.accountId != null) {
      account = tx.select().from(accounts).where(eq(accounts.id, target.accountId)).get() ?? null
      if (!account || account.userId !== DEMO_USER_ID) {
        throw new Error(`Account ${target.accountId} not found`)
      }
    }

    // One check for the whole batch — every row shares this target, unlike
    // createTransaction where it's re-checked per call.
    assertCardAccountPairing(card, target.accountId)

    const validCategories = new Set(
      tx
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.userId, DEMO_USER_ID))
        .all()
        .map((r) => r.name)
    )

    // Authoritative duplicate re-check against the ledger, scoped to the
    // date range this batch spans (padded a day either way for the
    // transaction-date-vs-posting-date drift case) — the preview's flags
    // are advisory and may be stale by the time Import is pressed.
    const isoDates = rows.map((r) => r.date).filter((d) => ISO_DATE_RE.test(d))
    const existing = isoDates.length
      ? tx
          .select({
            date: transactions.date,
            amount: transactions.amount,
            merchant: transactions.merchant,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, DEMO_USER_ID),
              gte(
                transactions.date,
                format(addDays(parseISO(isoDates.reduce((a, b) => (a < b ? a : b))), -1), "yyyy-MM-dd")
              ),
              lte(
                transactions.date,
                format(addDays(parseISO(isoDates.reduce((a, b) => (a > b ? a : b))), 1), "yyyy-MM-dd")
              )
            )
          )
          .all()
      : []

    const seenInBatch = new Set<string>()
    const failed: ImportResult["failed"] = []
    const toInsert: (typeof transactions.$inferInsert)[] = []
    let accountDelta = 0

    rows.forEach((row, index) => {
      if (!ISO_DATE_RE.test(row.date)) {
        failed.push({ index, reason: "Invalid date" })
        return
      }
      if (!row.merchant.trim()) {
        failed.push({ index, reason: "Merchant is required" })
        return
      }
      if (!Number.isFinite(row.amount) || row.amount <= 0) {
        failed.push({ index, reason: "Amount must be a positive number" })
        return
      }
      if (!validCategories.has(row.category)) {
        failed.push({ index, reason: `Unknown category "${row.category}"` })
        return
      }

      const signed = row.type === "expense" ? -Math.abs(row.amount) : Math.abs(row.amount)
      const norm = normalizeMerchant(row.merchant)
      const batchKey = `${row.date}|${signed.toFixed(2)}|${norm}`
      if (seenInBatch.has(batchKey)) {
        return // silently dropped — same duplicate reported in the preview
      }

      const isDuplicate = existing.some(
        (e) =>
          Math.abs(e.amount - signed) < AMOUNT_EPSILON &&
          Math.abs(dayOffset(row.date, e.date)) <= 1 &&
          merchantsLikelyMatch(norm, normalizeMerchant(e.merchant))
      )
      if (isDuplicate) return

      seenInBatch.add(batchKey)
      accountDelta += signed
      toInsert.push({
        userId: DEMO_USER_ID,
        accountId: target.accountId,
        cardId: card?.id ?? null,
        merchant: row.merchant.trim(),
        transactionId: generateTransactionId(),
        amount: signed,
        date: row.date,
        logo: "",
        category: row.category,
        status: row.status,
        type: row.type,
      })
    })

    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE)
      if (chunk.length > 0) tx.insert(transactions).values(chunk).run()
    }

    if (account && accountDelta !== 0) {
      tx.update(accounts)
        .set({ balance: Math.round((account.balance + accountDelta) * 100) / 100 })
        .where(eq(accounts.id, account.id))
        .run()
    }

    const skippedDuplicates = rows.length - toInsert.length - failed.length
    return { created: toInsert.length, skippedDuplicates, failed }
  })
}
