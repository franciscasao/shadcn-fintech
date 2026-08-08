import { and, eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, cardPayments, cards, categories, transactions } from "@/server/db/schema"
import { displayDate } from "@/server/db/format"
import { ICON_COLORS } from "@/server/icon-colors"
import { generateTransactionId } from "@/server/mutations/transactions"
import type { CardPayment } from "@/lib/types"

/** Bad input (unknown card, insufficient funds) — maps to 400. */
export class CardPaymentValidationError extends Error {}
/** A referenced card or account doesn't exist — maps to 404. */
export class CardPaymentNotFoundError extends Error {}

const CARD_PAYMENT_CATEGORY = "Card Payment"

/** Ensures the "Card Payment" category exists for the demo user (idempotent)
 * — mirrors ensureTransferCategory in @/server/mutations/transfers. Reuses
 * the existing "banknote" icon (already used by "Income") rather than
 * introducing a new one. */
function ensureCardPaymentCategory(db: ReturnType<typeof getDb>) {
  const existing = db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, DEMO_USER_ID), eq(categories.name, CARD_PAYMENT_CATEGORY)))
    .get()
  if (existing) return
  db.insert(categories)
    .values({
      userId: DEMO_USER_ID,
      name: CARD_PAYMENT_CATEGORY,
      iconName: "banknote",
      color: ICON_COLORS.banknote,
      budgetBucket: null,
    })
    .run()
}

export type NewCardPaymentInput = {
  cardId: number
  fromAccountId: number
  amount: number // always positive
  date: string // ISO yyyy-MM-dd
  note?: string
}

/** Records money paid toward a credit card's balance: debits
 * `fromAccountId` and writes one ledger leg (an expense filed under "Card
 * Payment", carrying `cardPaymentId`) so the payment is visible in
 * transaction history. Single-legged by design — unlike an internal
 * transfer, the card side isn't a ledger account; its "balance owed" is
 * derived from the ledger (see getCards() in @/server/queries/cards), so
 * paying it down just means fewer un-paid card transactions to net against.
 * Modeled directly on createInternalTransfer in @/server/mutations/transfers. */
export async function createCardPayment(input: NewCardPaymentInput): Promise<CardPayment> {
  const db = getDb()
  ensureCardPaymentCategory(db)

  const result = db.transaction((tx) => {
    const card = tx.select().from(cards).where(eq(cards.id, input.cardId)).get()
    if (!card || card.userId !== DEMO_USER_ID) {
      throw new CardPaymentNotFoundError(`Card ${input.cardId} not found`)
    }
    if (card.product !== "credit") {
      throw new CardPaymentValidationError(`${card.name} isn't a credit card`)
    }

    const from = tx.select().from(accounts).where(eq(accounts.id, input.fromAccountId)).get()
    if (!from || from.userId !== DEMO_USER_ID) {
      throw new CardPaymentNotFoundError(`Account ${input.fromAccountId} not found`)
    }
    if (from.balance < input.amount) {
      throw new CardPaymentValidationError(`Insufficient funds in ${from.name}`)
    }

    const [payment] = tx
      .insert(cardPayments)
      .values({
        userId: DEMO_USER_ID,
        cardId: input.cardId,
        fromAccountId: input.fromAccountId,
        amount: input.amount,
        date: input.date,
        status: "completed",
        note: input.note,
      })
      .returning()
      .all()

    tx.insert(transactions)
      .values({
        userId: DEMO_USER_ID,
        accountId: input.fromAccountId,
        merchant: `Payment to ${card.name}`,
        transactionId: generateTransactionId(),
        amount: -Math.abs(input.amount),
        date: input.date,
        logo: "",
        category: CARD_PAYMENT_CATEGORY,
        status: "completed",
        type: "expense",
        notes: input.note,
        cardPaymentId: payment.id,
      })
      .run()

    tx.update(accounts)
      .set({ balance: Math.round((from.balance - input.amount) * 100) / 100 })
      .where(eq(accounts.id, input.fromAccountId))
      .run()

    return { payment, fromAccountName: from.name }
  })

  return {
    id: String(result.payment.id),
    cardId: String(result.payment.cardId),
    fromAccountId: String(result.payment.fromAccountId),
    fromAccountName: result.fromAccountName,
    amount: result.payment.amount,
    date: displayDate(result.payment.date),
    status: result.payment.status,
    note: result.payment.note ?? undefined,
  }
}

/** Reverses a card payment: restores the funding account's balance and
 * removes both the payment row and its ledger leg — mirrors the internal
 * branch of deleteTransfer in @/server/mutations/transfers. */
export async function deleteCardPayment(id: number): Promise<void> {
  const db = getDb()

  db.transaction((tx) => {
    const payment = tx.select().from(cardPayments).where(eq(cardPayments.id, id)).get()
    if (!payment) return

    if (payment.fromAccountId != null) {
      const from = tx.select().from(accounts).where(eq(accounts.id, payment.fromAccountId)).get()
      if (from) {
        tx.update(accounts)
          .set({ balance: Math.round((from.balance + payment.amount) * 100) / 100 })
          .where(eq(accounts.id, payment.fromAccountId))
          .run()
      }
    }

    tx.delete(transactions).where(eq(transactions.cardPaymentId, id)).run()
    tx.delete(cardPayments).where(eq(cardPayments.id, id)).run()
  })
}
