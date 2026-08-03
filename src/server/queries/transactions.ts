import { desc, eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { cards, transactions } from "@/server/db/schema"
import { displayDate } from "@/server/db/format"
import type { FullTransaction, Transaction } from "@/lib/types"

function toFullTransaction(row: {
  transactions: typeof transactions.$inferSelect
  cards: typeof cards.$inferSelect | null
}): FullTransaction {
  const t = row.transactions
  return {
    id: String(t.id),
    merchant: t.merchant,
    transactionId: t.transactionId,
    amount: t.amount,
    date: displayDate(t.date),
    logo: t.logo,
    category: t.category,
    status: t.status,
    type: t.type,
    notes: t.notes ?? undefined,
    merchantInfo: t.merchantInfo ?? undefined,
    cardLast4: row.cards?.last4,
  }
}

/** All transactions for the Transactions page, newest first. Filtering (search,
 * category, status, type) happens client-side in transactions-page-client.tsx,
 * same as the original static-data version. */
export async function getTransactions(): Promise<FullTransaction[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(transactions)
    .leftJoin(cards, eq(transactions.cardId, cards.id))
    .where(eq(transactions.userId, DEMO_USER_ID))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all()
  return rows.map(toFullTransaction)
}

/** Most recent transactions for the dashboard widget and command palette. */
export async function getRecentTransactions(limit = 7): Promise<Transaction[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, DEMO_USER_ID))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
    .all()
  return rows.map((row) => ({
    id: String(row.id),
    merchant: row.merchant,
    transactionId: row.transactionId,
    amount: row.amount,
    date: displayDate(row.date),
    logo: row.logo,
    category: row.category,
  }))
}
