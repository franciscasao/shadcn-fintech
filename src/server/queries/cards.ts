import { and, eq, gte, lt, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { cards, transactions } from "@/server/db/schema"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
import type { CardData } from "@/lib/types"

function currentMonthBounds() {
  const start = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth(), 1)
  const end = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth() + 1, 1)
  return { start: toISODate(start), end: toISODate(end) }
}

export async function getCards(): Promise<CardData[]> {
  const db = getDb()
  const rows = db.select().from(cards).where(eq(cards.userId, DEMO_USER_ID)).all()

  const { start, end } = currentMonthBounds()
  const spendRows = db
    .select({
      cardId: transactions.cardId,
      total: sql<number>`sum(abs(${transactions.amount}))`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, DEMO_USER_ID),
        eq(transactions.type, "expense"),
        gte(transactions.date, start),
        lt(transactions.date, end)
      )
    )
    .groupBy(transactions.cardId)
    .all()
  const spendByCard = new Map(spendRows.map((r) => [r.cardId, r.total]))

  return rows.map((c) => ({
    id: String(c.id),
    name: c.name,
    type: c.type,
    last4: c.last4,
    cardNumber: c.cardNumber,
    holder: c.holder,
    expiry: c.expiry,
    cvv: c.cvv,
    network: c.network,
    frozen: c.frozen,
    dailyLimit: c.dailyLimit,
    monthlySpend: Math.round((spendByCard.get(c.id) ?? 0) * 100) / 100,
    monthlyLimit: c.monthlyLimit,
    color: c.color,
  }))
}
