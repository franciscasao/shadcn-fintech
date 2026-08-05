import { and, eq, gte, lt, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, cards, transactions } from "@/server/db/schema"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
import type { CardData } from "@/lib/types"

function currentMonthBounds() {
  const start = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth(), 1)
  const end = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth() + 1, 1)
  return { start: toISODate(start), end: toISODate(end) }
}

/** Shared row -> API-shape mapper, also used by @/server/mutations/cards. */
export function toCardData(
  row: typeof cards.$inferSelect,
  extra: { monthlySpend: number; accountName: string | null }
): CardData {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    last4: row.last4,
    cardNumber: row.cardNumber,
    holder: row.holder,
    expiry: row.expiry,
    cvv: row.cvv,
    network: row.network,
    frozen: row.frozen,
    dailyLimit: row.dailyLimit,
    monthlySpend: extra.monthlySpend,
    monthlyLimit: row.monthlyLimit,
    color: row.color,
    accountId: row.accountId != null ? String(row.accountId) : null,
    accountName: extra.accountName,
    issuer: row.issuer,
    issuerLogo: row.issuerLogo,
    issuerTemplateId: row.issuerTemplateId,
    product: row.product,
  }
}

export async function getCards(): Promise<CardData[]> {
  const db = getDb()
  const rows = db
    .select({ card: cards, accountName: accounts.name })
    .from(cards)
    .leftJoin(accounts, eq(cards.accountId, accounts.id))
    .where(eq(cards.userId, DEMO_USER_ID))
    .all()

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

  return rows.map(({ card, accountName }) =>
    toCardData(card, {
      monthlySpend: Math.round((spendByCard.get(card.id) ?? 0) * 100) / 100,
      accountName: accountName ?? null,
    })
  )
}
