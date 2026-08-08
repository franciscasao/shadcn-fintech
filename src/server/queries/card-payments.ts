import { and, desc, eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, cardPayments } from "@/server/db/schema"
import { displayDate } from "@/server/db/format"
import type { CardPayment } from "@/lib/types"

/** Shared row -> API-shape mapper, also used by @/server/mutations/card-payments. */
export function toCardPayment(row: {
  card_payments: typeof cardPayments.$inferSelect
  accounts: typeof accounts.$inferSelect | null
}): CardPayment {
  const p = row.card_payments
  return {
    id: String(p.id),
    cardId: String(p.cardId),
    fromAccountId: p.fromAccountId != null ? String(p.fromAccountId) : null,
    fromAccountName: row.accounts?.name ?? null,
    amount: p.amount,
    date: displayDate(p.date),
    status: p.status,
    note: p.note ?? undefined,
  }
}

/** Payment history, optionally scoped to one card — powers the per-card
 * payment list on /cards. leftJoin, not innerJoin: a payment's funding
 * account may have since been deleted (see deleteAccount, which nulls
 * card_payments.from_account_id rather than blocking the delete). */
export async function getCardPayments(cardId?: number): Promise<CardPayment[]> {
  const db = getDb()
  const rows = db
    .select()
    .from(cardPayments)
    .leftJoin(accounts, eq(cardPayments.fromAccountId, accounts.id))
    .where(
      cardId != null
        ? and(eq(cardPayments.userId, DEMO_USER_ID), eq(cardPayments.cardId, cardId))
        : eq(cardPayments.userId, DEMO_USER_ID)
    )
    .orderBy(desc(cardPayments.date), desc(cardPayments.id))
    .all()
  return rows.map(toCardPayment)
}
