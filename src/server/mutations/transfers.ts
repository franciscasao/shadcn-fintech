import { and, eq } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, categories, contacts, transactions, transfers } from "@/server/db/schema"
import { getPrimaryAccountId } from "@/server/queries/accounts"
import { LEDGER_ANCHOR } from "@/server/db/generate"
import { displayDate, toISODate } from "@/server/db/format"
import { ICON_COLORS } from "@/server/icon-colors"
import { generateTransactionId } from "@/server/mutations/transactions"
import type { TransferRecord } from "@/lib/types"

export type NewTransferInput = {
  contactId: number
  amount: number
  note?: string
}

/** Bad input (same account on both sides, insufficient funds) — maps to 400. */
export class TransferValidationError extends Error {}
/** A referenced account or contact doesn't exist — maps to 404. */
export class TransferNotFoundError extends Error {}

export async function createTransfer(input: NewTransferInput): Promise<TransferRecord> {
  const db = getDb()
  const contact = db.select().from(contacts).where(eq(contacts.id, input.contactId)).get()
  if (!contact) throw new TransferNotFoundError(`Contact ${input.contactId} not found`)

  const accountId = await getPrimaryAccountId()
  const date = toISODate(LEDGER_ANCHOR)

  // Insert the transfer and debit the sending account atomically.
  const row = db.transaction((tx) => {
    const [inserted] = tx
      .insert(transfers)
      .values({
        userId: DEMO_USER_ID,
        kind: "external",
        contactId: input.contactId,
        accountId,
        type: "sent",
        amount: input.amount,
        date,
        status: "completed",
        note: input.note,
      })
      .returning()
      .all()

    const account = tx.select().from(accounts).where(eq(accounts.id, accountId)).get()
    if (!account) throw new TransferNotFoundError(`Account ${accountId} not found`)
    tx.update(accounts)
      .set({ balance: Math.round((account.balance - input.amount) * 100) / 100 })
      .where(eq(accounts.id, accountId))
      .run()

    return inserted
  })

  return {
    id: String(row.id),
    kind: "external",
    type: row.type,
    contactName: contact.name,
    contactAvatar: contact.avatar,
    amount: row.amount,
    date: displayDate(row.date),
    status: row.status,
    note: row.note ?? undefined,
  }
}

const TRANSFER_CATEGORY = "Transfer"

/** Ensures the "Transfer" category exists for the demo user (idempotent) so
 * internal-transfer ledger legs have somewhere to file under — mirrors how
 * "Income" is seeded with no budget bucket (see schema.ts). Runs against the
 * plain db handle before the balance-moving transaction starts, the same
 * check-then-insert pattern findByName() uses in @/server/mutations/categories. */
function ensureTransferCategory(db: ReturnType<typeof getDb>) {
  const existing = db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, DEMO_USER_ID), eq(categories.name, TRANSFER_CATEGORY)))
    .get()
  if (existing) return
  db.insert(categories)
    .values({
      userId: DEMO_USER_ID,
      name: TRANSFER_CATEGORY,
      iconName: "repeat",
      color: ICON_COLORS.repeat,
      budgetBucket: null,
    })
    .run()
}

export type NewInternalTransferInput = {
  fromAccountId: number
  toAccountId: number
  amount: number // always positive
  date: string // ISO yyyy-MM-dd
  note?: string
}

/** Moves money between two of the user's own accounts: debits
 * `fromAccountId`, credits `toAccountId`, and writes a linked pair of ledger
 * rows (an expense leg on the source, an income leg on the destination) so
 * the movement is visible in transaction history on both accounts —
 * mirroring createTransaction() in @/server/mutations/transactions. Both
 * legs are filed under a "Transfer" category with no budget bucket so
 * getAllTransactions() in @/server/queries/analytics can exclude them from
 * income/spending aggregates. */
export async function createInternalTransfer(
  input: NewInternalTransferInput
): Promise<TransferRecord> {
  const db = getDb()
  ensureTransferCategory(db)

  const result = db.transaction((tx) => {
    if (input.fromAccountId === input.toAccountId) {
      throw new TransferValidationError("Source and destination accounts must be different")
    }

    const from = tx.select().from(accounts).where(eq(accounts.id, input.fromAccountId)).get()
    if (!from) throw new TransferNotFoundError(`Account ${input.fromAccountId} not found`)
    const to = tx.select().from(accounts).where(eq(accounts.id, input.toAccountId)).get()
    if (!to) throw new TransferNotFoundError(`Account ${input.toAccountId} not found`)

    if (from.balance < input.amount) {
      throw new TransferValidationError(`Insufficient funds in ${from.name}`)
    }

    const [transfer] = tx
      .insert(transfers)
      .values({
        userId: DEMO_USER_ID,
        kind: "internal",
        contactId: null,
        accountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        type: "sent",
        amount: input.amount,
        date: input.date,
        status: "completed",
        note: input.note,
      })
      .returning()
      .all()

    tx.insert(transactions)
      .values([
        {
          userId: DEMO_USER_ID,
          accountId: input.fromAccountId,
          merchant: `Transfer to ${to.name}`,
          transactionId: generateTransactionId(),
          amount: -Math.abs(input.amount),
          date: input.date,
          logo: "",
          category: TRANSFER_CATEGORY,
          status: "completed",
          type: "expense",
          notes: input.note,
          transferId: transfer.id,
        },
        {
          userId: DEMO_USER_ID,
          accountId: input.toAccountId,
          merchant: `Transfer from ${from.name}`,
          transactionId: generateTransactionId(),
          amount: Math.abs(input.amount),
          date: input.date,
          logo: "",
          category: TRANSFER_CATEGORY,
          status: "completed",
          type: "income",
          notes: input.note,
          transferId: transfer.id,
        },
      ])
      .run()

    tx.update(accounts)
      .set({ balance: Math.round((from.balance - input.amount) * 100) / 100 })
      .where(eq(accounts.id, input.fromAccountId))
      .run()
    tx.update(accounts)
      .set({ balance: Math.round((to.balance + input.amount) * 100) / 100 })
      .where(eq(accounts.id, input.toAccountId))
      .run()

    return { transfer, fromName: from.name, toName: to.name }
  })

  const { transfer, fromName, toName } = result
  return {
    id: String(transfer.id),
    kind: "internal",
    type: transfer.type,
    fromAccountName: fromName,
    toAccountName: toName,
    amount: transfer.amount,
    date: displayDate(transfer.date),
    status: transfer.status,
    note: transfer.note ?? undefined,
  }
}

export async function deleteTransfer(id: number): Promise<void> {
  const db = getDb()

  db.transaction((tx) => {
    const transfer = tx.select().from(transfers).where(eq(transfers.id, id)).get()

    // Internal transfers wrote a linked pair of ledger rows and moved two
    // balances — reverse both before removing the rows, otherwise "cancel"
    // silently leaves the money debited from one account and never
    // reversed. External (contact) transfers keep their existing behavior:
    // a bare delete with no balance reversal.
    if (transfer?.kind === "internal" && transfer.accountId && transfer.toAccountId) {
      const from = tx.select().from(accounts).where(eq(accounts.id, transfer.accountId)).get()
      if (from) {
        tx.update(accounts)
          .set({ balance: Math.round((from.balance + transfer.amount) * 100) / 100 })
          .where(eq(accounts.id, transfer.accountId))
          .run()
      }
      const to = tx.select().from(accounts).where(eq(accounts.id, transfer.toAccountId)).get()
      if (to) {
        tx.update(accounts)
          .set({ balance: Math.round((to.balance - transfer.amount) * 100) / 100 })
          .where(eq(accounts.id, transfer.toAccountId))
          .run()
      }
      tx.delete(transactions).where(eq(transactions.transferId, id)).run()
    }

    tx.delete(transfers).where(eq(transfers.id, id)).run()
  })
}
