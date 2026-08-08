import { and, eq, gte, inArray, lt, sql } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, cardPayments, cards, transactions } from "@/server/db/schema"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { toISODate } from "@/server/db/format"
import { DEFAULT_CREDIT_TERMS } from "@/lib/ph-cards"
import {
  daysUntil,
  interestIfMinimumOnly,
  lastStatementClose,
  minimumDue,
  nextDueDate,
  paymentStatus,
  utilization,
} from "@/lib/credit"
import type { CardData, CreditSummary } from "@/lib/types"

function currentMonthBounds() {
  const start = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth(), 1)
  const end = new Date(LEDGER_ANCHOR.getFullYear(), LEDGER_ANCHOR.getMonth() + 1, 1)
  return { start: toISODate(start), end: toISODate(end) }
}

/** Shared row -> API-shape mapper, also used by @/server/mutations/cards. */
export function toCardData(
  row: typeof cards.$inferSelect,
  extra: { monthlySpend: number; accountName: string | null; credit: CreditSummary | null }
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
    creditLimit: row.creditLimit,
    apr: row.apr,
    statementDay: row.statementDay,
    dueDay: row.dueDay,
    credit: extra.credit,
  }
}

/** Derives a credit card's balance-owed / statement / due-date summary from
 * the ledger — never stored, so it can't drift out of sync. `ledger` and
 * `payments` are this one card's rows only, already scoped by the caller. */
function buildCreditSummary(
  card: typeof cards.$inferSelect,
  ledger: { date: string; amount: number }[],
  payments: { date: string; amount: number }[]
): CreditSummary {
  const statementDay = card.statementDay ?? DEFAULT_CREDIT_TERMS.statementDay
  const dueDay = card.dueDay ?? DEFAULT_CREDIT_TERMS.dueDay
  const creditLimit = card.creditLimit ?? DEFAULT_CREDIT_TERMS.creditLimit

  // Expenses are stored negative, refunds/income positive — negating the
  // signed sum turns "money spent" into "money owed". Completed payments
  // reduce that directly.
  const owedTotal =
    -ledger.reduce((sum, r) => sum + r.amount, 0) - payments.reduce((sum, r) => sum + r.amount, 0)
  const balanceOwed = Math.max(Math.round(owedTotal * 100) / 100, 0)

  const closeDate = lastStatementClose(statementDay, LEDGER_ANCHOR)
  const closeISO = toISODate(closeDate)
  const dueDate = nextDueDate(statementDay, dueDay, LEDGER_ANCHOR)

  const statementOwed =
    -ledger.filter((r) => r.date <= closeISO).reduce((sum, r) => sum + r.amount, 0) -
    payments.filter((r) => r.date <= closeISO).reduce((sum, r) => sum + r.amount, 0)
  const statementBalance = Math.max(Math.round(statementOwed * 100) / 100, 0)

  const minDue = minimumDue(statementBalance)
  const daysUntilDue = daysUntil(dueDate, LEDGER_ANCHOR)

  return {
    balanceOwed,
    availableCredit: Math.round((creditLimit - balanceOwed) * 100) / 100,
    utilization: utilization(balanceOwed, creditLimit),
    statementBalance,
    dueDate: toISODate(dueDate),
    daysUntilDue,
    minimumDue: minDue,
    interestIfMinimumOnly: interestIfMinimumOnly(statementBalance, minDue, card.apr),
    status: paymentStatus(balanceOwed, statementBalance, daysUntilDue),
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

  // Credit summaries need every ledger row and payment for each credit card
  // (not just this month's), so pull them once for all credit cards and
  // group in memory — cheap at this data volume, and the per-card statement
  // close date (statementDay varies by card) makes a single grouped SQL
  // aggregate awkward anyway.
  const creditCardIds = rows.filter((r) => r.card.product === "credit").map((r) => r.card.id)
  const ledgerByCard = new Map<number, { date: string; amount: number }[]>()
  const paymentsByCard = new Map<number, { date: string; amount: number }[]>()

  if (creditCardIds.length > 0) {
    const ledgerRows = db
      .select({ cardId: transactions.cardId, date: transactions.date, amount: transactions.amount })
      .from(transactions)
      .where(
        and(eq(transactions.userId, DEMO_USER_ID), inArray(transactions.cardId, creditCardIds))
      )
      .all()
    for (const r of ledgerRows) {
      if (r.cardId == null) continue
      const list = ledgerByCard.get(r.cardId) ?? []
      list.push({ date: r.date, amount: r.amount })
      ledgerByCard.set(r.cardId, list)
    }

    const paymentRows = db
      .select({ cardId: cardPayments.cardId, date: cardPayments.date, amount: cardPayments.amount })
      .from(cardPayments)
      .where(
        and(
          eq(cardPayments.userId, DEMO_USER_ID),
          eq(cardPayments.status, "completed"),
          inArray(cardPayments.cardId, creditCardIds)
        )
      )
      .all()
    for (const r of paymentRows) {
      const list = paymentsByCard.get(r.cardId) ?? []
      list.push({ date: r.date, amount: r.amount })
      paymentsByCard.set(r.cardId, list)
    }
  }

  return rows.map(({ card, accountName }) => {
    const credit =
      card.product === "credit"
        ? buildCreditSummary(card, ledgerByCard.get(card.id) ?? [], paymentsByCard.get(card.id) ?? [])
        : null

    return toCardData(card, {
      monthlySpend: Math.round((spendByCard.get(card.id) ?? 0) * 100) / 100,
      accountName: accountName ?? null,
      credit,
    })
  })
}

export async function getCardById(id: number) {
  const db = getDb()
  return db.select().from(cards).where(eq(cards.id, id)).get()
}

/** Single-card version of the credit summary built inline by getCards() —
 * used by mutations (@/server/mutations/cards, @/server/mutations/card-payments)
 * that need to return an up-to-date CardData for just the one card they
 * touched, without re-running the full getCards() aggregate. Returns null
 * for a non-credit card. */
export async function getCreditSummaryForCard(
  card: typeof cards.$inferSelect
): Promise<CreditSummary | null> {
  if (card.product !== "credit") return null
  const db = getDb()

  const ledger = db
    .select({ date: transactions.date, amount: transactions.amount })
    .from(transactions)
    .where(and(eq(transactions.userId, DEMO_USER_ID), eq(transactions.cardId, card.id)))
    .all()

  const payments = db
    .select({ date: cardPayments.date, amount: cardPayments.amount })
    .from(cardPayments)
    .where(
      and(
        eq(cardPayments.userId, DEMO_USER_ID),
        eq(cardPayments.cardId, card.id),
        eq(cardPayments.status, "completed")
      )
    )
    .all()

  return buildCreditSummary(card, ledger, payments)
}
