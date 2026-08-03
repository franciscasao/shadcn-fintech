import { eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, transactions } from "@/server/db/schema"
import { displayDate } from "@/server/db/format"
import type { FullTransaction } from "@/lib/types"

export type NewTransactionInput = {
  merchant: string
  amount: number // always positive; sign is derived from `type`
  type: "expense" | "income"
  category: string
  date: string // ISO yyyy-MM-dd
  accountId: number
  status: "completed" | "pending" | "failed"
  notes?: string
}

/** Synthesizes an id in the same shape as the seeded ledger (e.g. "TXN_847291"). */
function generateTransactionId(): string {
  return `TXN_${Math.floor(100000 + Math.random() * 900000)}`
}

/** Records a manually-entered transaction and keeps the linked account's
 * balance in sync — an expense debits it, income credits it — atomically,
 * mirroring createTransfer() in @/server/mutations/transfers. */
export async function createTransaction(input: NewTransactionInput): Promise<FullTransaction> {
  const db = getDb()

  // Seeded rows store expenses negative and income positive (see
  // src/server/db/fixtures.ts) — normalize once so the same signed value
  // is both the stored amount and the balance delta below.
  const signed = input.type === "expense" ? -Math.abs(input.amount) : Math.abs(input.amount)

  const row = db.transaction((tx) => {
    const account = tx.select().from(accounts).where(eq(accounts.id, input.accountId)).get()
    if (!account) throw new Error(`Account ${input.accountId} not found`)

    const [inserted] = tx
      .insert(transactions)
      .values({
        userId: DEMO_USER_ID,
        accountId: input.accountId,
        merchant: input.merchant,
        transactionId: generateTransactionId(),
        amount: signed,
        date: input.date,
        logo: "",
        category: input.category,
        status: input.status,
        type: input.type,
        notes: input.notes,
      })
      .returning()
      .all()

    tx.update(accounts)
      .set({ balance: Math.round((account.balance + signed) * 100) / 100 })
      .where(eq(accounts.id, input.accountId))
      .run()

    return inserted
  })

  return {
    id: String(row.id),
    merchant: row.merchant,
    transactionId: row.transactionId,
    amount: row.amount,
    date: displayDate(row.date),
    logo: row.logo,
    category: row.category,
    status: row.status,
    type: row.type,
    notes: row.notes ?? undefined,
    merchantInfo: row.merchantInfo ?? undefined,
  }
}
