import { eq, inArray, or } from "drizzle-orm"

import { DEMO_USER_ID, getDb } from "@/server/db"
import { accounts, cardPayments, cards, transactions, transfers } from "@/server/db/schema"
import { toBankAccount } from "@/server/queries/accounts"
import { getInstitution, type NewAccountInput } from "@/lib/ph-institutions"
import type { BankAccount } from "@/lib/types"

export type { NewAccountInput }

// Fallback border color when no institution template applies (the "custom
// institution" path) — same values the client picker used to hardcode.
const TYPE_COLORS: Record<BankAccount["type"], string> = {
  checking: "bg-blue-500",
  savings: "bg-emerald-500",
  crypto: "bg-orange-500",
  investment: "bg-violet-500",
}

function pick<T>(value: T | undefined, fallback: T): T {
  return value !== undefined ? value : fallback
}

export async function createAccount(input: NewAccountInput): Promise<BankAccount> {
  const db = getDb()
  const template = getInstitution(input.templateId)
  const typeLabel = input.type.charAt(0).toUpperCase() + input.type.slice(1)

  const [row] = db
    .insert(accounts)
    .values({
      userId: DEMO_USER_ID,
      name: input.nickname?.trim() || `${input.institution} ${typeLabel}`,
      type: input.type,
      institution: input.institution,
      institutionLogo: template?.logo ?? "",
      accountNumber: `****${input.accountNumber.slice(-4)}`,
      balance: input.balance ?? 0,
      currency: "₱",
      change: 0,
      changePercent: 0,
      lastActivity: "Just now",
      color: template?.color ?? TYPE_COLORS[input.type] ?? "bg-gray-500",

      templateId: input.templateId,
      institutionKind: template?.kind ?? null,
      pdicInsured: pick(input.pdicInsured, template?.pdicInsured ?? false),

      interestRate: pick(input.interestRate, template?.interestRate ?? null),
      creditingFrequency: pick(input.creditingFrequency, template?.creditingFrequency ?? "none"),
      creditingTiming: pick(input.creditingTiming, template?.creditingTiming ?? null),
      compounding: pick(input.compounding, template?.compounding ?? false),

      maintainingBalance: pick(input.maintainingBalance, template?.maintainingBalance ?? null),
      requiredAdb: pick(input.requiredAdb, template?.requiredAdb ?? null),
      interestCap: pick(input.interestCap, template?.interestCap ?? null),

      monthlyFee: pick(input.monthlyFee, template?.monthlyFee ?? null),
      freeTransfersPerMonth: pick(
        input.freeTransfersPerMonth,
        template?.freeTransfersPerMonth ?? null
      ),
      instapayFee: pick(input.instapayFee, template?.instapayFee ?? null),
      pesonetFee: pick(input.pesonetFee, template?.pesonetFee ?? null),
      dailyTransferLimit: pick(input.dailyTransferLimit, template?.dailyTransferLimit ?? null),
    })
    .returning()
    .all()
  return toBankAccount(row)
}

/** Adjusts an account's stored balance by `delta` (positive = credit, negative = debit). */
export async function adjustAccountBalance(accountId: number, delta: number) {
  const db = getDb()
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get()
  if (!account) throw new Error(`Account ${accountId} not found`)
  db.update(accounts)
    .set({ balance: Math.round((account.balance + delta) * 100) / 100 })
    .where(eq(accounts.id, accountId))
    .run()
}

/** Sets an account's stored balance to an absolute value (e.g. a manual correction). */
export async function setAccountBalance(accountId: number, balance: number): Promise<BankAccount> {
  const db = getDb()
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get()
  if (!account) throw new Error(`Account ${accountId} not found`)
  const [row] = db
    .update(accounts)
    .set({ balance: Math.round(balance * 100) / 100 })
    .where(eq(accounts.id, accountId))
    .returning()
    .all()
  return toBankAccount(row)
}

export type DeleteAccountResult = "not_found" | "last_account" | void

/** Deletes an account together with its history: its own ledger rows, any
 * transfer it was either side of, and unlinks (rather than deletes) any card
 * funded by it so the card survives with no funding account — mirrors the
 * degrade-gracefully handling already in getCards() for a null accountId.
 * Refuses to delete the user's only account: getPrimaryAccountId() throws
 * once the accounts table is empty, which would break external transfers
 * app-wide. */
export async function deleteAccount(id: number): Promise<DeleteAccountResult> {
  const db = getDb()

  return db.transaction((tx) => {
    const account = tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .get()
    if (!account || account.userId !== DEMO_USER_ID) return "not_found"

    const userAccounts = tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, DEMO_USER_ID))
      .all()
    if (userAccounts.length <= 1) return "last_account"

    // Transfers this account was either side of. For an internal transfer,
    // the *other* account's ledger leg and balance need to be reversed
    // before that leg is deleted — otherwise the surviving account keeps a
    // balance that reflects a ledger row which just vanished.
    const linkedTransfers = tx
      .select()
      .from(transfers)
      .where(or(eq(transfers.accountId, id), eq(transfers.toAccountId, id)))
      .all()
    const transferIds = linkedTransfers.map((t) => t.id)

    if (transferIds.length > 0) {
      const legs = tx
        .select()
        .from(transactions)
        .where(inArray(transactions.transferId, transferIds))
        .all()

      const deltaByAccount = new Map<number, number>()
      for (const leg of legs) {
        if (leg.accountId == null || leg.accountId === id) continue
        deltaByAccount.set(leg.accountId, (deltaByAccount.get(leg.accountId) ?? 0) - leg.amount)
      }
      for (const [accountId, delta] of deltaByAccount) {
        const other = tx.select().from(accounts).where(eq(accounts.id, accountId)).get()
        if (!other) continue
        tx.update(accounts)
          .set({ balance: Math.round((other.balance + delta) * 100) / 100 })
          .where(eq(accounts.id, accountId))
          .run()
      }

      tx.delete(transactions).where(inArray(transactions.transferId, transferIds)).run()
      tx.delete(transfers).where(inArray(transfers.id, transferIds)).run()
    }

    // The account's own (non-transfer) ledger rows — no balance reversal
    // needed since the account itself is being removed. This also removes
    // any card-payment debit leg filed against this account; the
    // card_payments row itself survives (see below) since a card's balance
    // owed is derived from it directly, not from the ledger leg.
    tx.delete(transactions).where(eq(transactions.accountId, id)).run()

    tx.update(cards).set({ accountId: null }).where(eq(cards.accountId, id)).run()

    // Unlink rather than delete, same reasoning as cards.accountId above —
    // and required before the account row can go: foreign_keys = ON (see
    // @/server/db) means a dangling card_payments.from_account_id would
    // block the delete below.
    tx.update(cardPayments).set({ fromAccountId: null }).where(eq(cardPayments.fromAccountId, id)).run()

    tx.delete(accounts).where(eq(accounts.id, id)).run()
  })
}
